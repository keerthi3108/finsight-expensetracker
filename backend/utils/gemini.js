import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { parseJsonFromGemini } from "./parseJsonFromGemini.js";
import { prepareImageForGemini, isRateLimitError, getModelFallbackList } from "./imagePrep.js";
import { normalizeGeminiPayload } from "./receiptParse.js";
import { extractExpenseFromOcr } from "./localOcr.js";
import { extractExpenseFromGroq, hasGroqKey } from "./groqVision.js";

const GEMINI_TIMEOUT_MS = 45000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");
  return new GoogleGenerativeAI(apiKey);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out. Try again.")), ms)
    ),
  ]);
}

const RECEIPT_PROMPT = `You are an expert OCR system for Indian retail receipts, restaurant bills, pharmacy bills, and GST invoices.

Read the attached image carefully. Extract:
1. amount — FINAL amount the customer paid in INR (number only). Look for: GRAND TOTAL, NET AMOUNT, TOTAL, AMOUNT PAID, BALANCE, Bill Amount. Ignore subtotals, tax-only lines, and item prices unless no total exists.
2. merchant — shop/restaurant/pharmacy name (usually top of bill).
3. category — exactly one of: Food, Travel, Shopping, Medical, Bills, Recharge, Entertainment, Other.
4. date — transaction date as YYYY-MM-DD from the bill (not today's date unless printed on bill).
5. confidence — 0-100 how sure you are.

If text is blurry, infer the best guess from visible digits. Never return amount 0 unless the bill truly shows zero.

Respond with ONLY valid JSON:
{"amount":number,"merchant":string,"category":string,"date":"YYYY-MM-DD","confidence":number}`;

/** Placeholder when both Gemini and OCR fail. */
export function localReceiptFallback() {
  return {
    amount: 0,
    merchant: "Unknown (please edit)",
    category: "Other",
    date: new Date(),
    confidence: 25,
    usedFallback: true,
    source: "placeholder",
  };
}

async function generateOnce(parts, modelName) {
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });
  const result = await model.generateContent(parts);
  return result.response.text();
}

async function callGeminiModels(base64, mimeType) {
  const parts = [
    { text: RECEIPT_PROMPT },
    { inlineData: { mimeType, data: base64 } },
  ];
  const models = getModelFallbackList();
  let lastErr;

  for (const modelName of models) {
    try {
      const text = await withTimeout(generateOnce(parts, modelName), GEMINI_TIMEOUT_MS);
      return normalizeGeminiPayload(parseJsonFromGemini(text));
    } catch (err) {
      lastErr = err;
      const msg = err?.message || String(err);
      console.warn(`Gemini [${modelName}]:`, msg.slice(0, 160));
    }
  }
  throw lastErr || new Error("All Gemini models failed");
}

async function tryGeminiExtract(base64, mimeType) {
  const result = await callGeminiModels(base64, mimeType);
  return { ...result, source: "gemini" };
}

async function tryGroqExtract(base64, mimeType) {
  if (!hasGroqKey()) throw new Error("GROQ_API_KEY is not set");
  const groqResult = await withTimeout(
    extractExpenseFromGroq(base64, mimeType),
    GEMINI_TIMEOUT_MS
  );
  console.log("Receipt parsed via Groq vision");
  return groqResult;
}

async function tryOcrExtract(source) {
  const ocrResult = await extractExpenseFromOcr(source);
  console.log("Receipt parsed via local OCR");
  return ocrResult;
}

/**
 * Extract receipt fields — order from RECEIPT_PRIMARY (groq | gemini), then fallbacks.
 */
export async function extractExpenseFromImage(source) {
  const { base64, mimeType } = await prepareImageForGemini(source);
  const primary = (process.env.RECEIPT_PRIMARY || "gemini").trim().toLowerCase();

  const steps =
    primary === "groq"
      ? [
          { name: "Groq", run: () => tryGroqExtract(base64, mimeType) },
          { name: "Gemini", run: () => tryGeminiExtract(base64, mimeType) },
          { name: "OCR", run: () => tryOcrExtract(source) },
        ]
      : [
          { name: "Gemini", run: () => tryGeminiExtract(base64, mimeType) },
          { name: "Groq", run: () => tryGroqExtract(base64, mimeType) },
          { name: "OCR", run: () => tryOcrExtract(source) },
        ];

  for (const step of steps) {
    try {
      return await step.run();
    } catch (err) {
      console.warn(`${step.name} extract failed:`, err?.message?.slice(0, 120));
    }
  }

  return localReceiptFallback();
}

/**
 * Dynamic Gemini insights — falls back to caller's local summary on failure.
 */
export async function generateSpendingSummary(expenses) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const monthTotal = (list, m, y) =>
    list
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((s, e) => s + e.amount, 0);

  const currentMonthSpend = monthTotal(expenses, thisMonth, thisYear);
  const previousMonthSpend = monthTotal(expenses, lastMonth, lastMonthYear);

  const payload = expenses.slice(0, 30).map((e) => ({
    amount: e.amount,
    merchant: e.merchant,
    category: e.category,
    date: e.date,
  }));

  const prompt = `Indian personal finance advisor. Amounts in INR.
Expenses: ${JSON.stringify(payload)}
This month: ₹${currentMonthSpend.toFixed(0)} | Last month: ₹${previousMonthSpend.toFixed(0)}

Return ONLY JSON:
{"totalSpending":number,"spendingHabits":string,"spendingPattern":string,"monthlyComparison":string,"categoryInsights":{},"savingTips":[],"overspendingAlerts":[],"reminders":[]}`;

  const models = getModelFallbackList();
  for (const modelName of models) {
    try {
      const text = await withTimeout(
        generateOnce([{ text: prompt }], modelName),
        GEMINI_TIMEOUT_MS
      );
      const data = parseJsonFromGemini(text);
      const totalSpending =
        typeof data.totalSpending === "number" && Number.isFinite(data.totalSpending)
          ? data.totalSpending
          : expenses.reduce((s, e) => s + e.amount, 0);

      return {
        totalSpending,
        thisMonthSpend: currentMonthSpend,
        lastMonthSpend: previousMonthSpend,
        spendingHabits: String(data.spendingHabits || data.spendingPattern || ""),
        spendingPattern: String(data.spendingPattern || data.spendingHabits || ""),
        monthlyComparison: String(data.monthlyComparison || ""),
        categoryInsights:
          data.categoryInsights && typeof data.categoryInsights === "object"
            ? data.categoryInsights
            : {},
        savingTips: Array.isArray(data.savingTips) ? data.savingTips.map(String) : [],
        overspendingAlerts: Array.isArray(data.overspendingAlerts)
          ? data.overspendingAlerts.map(String)
          : [],
        reminders: Array.isArray(data.reminders) ? data.reminders.map(String) : [],
        aiGenerated: true,
      };
    } catch (e) {
      console.warn(`Summary model ${modelName} failed:`, e.message?.slice(0, 100));
    }
  }
  throw new Error("Summary generation failed");
}

export function publicImagePath(filename) {
  return `/uploads/${filename}`;
}

export function mimeFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}
