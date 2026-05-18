import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { parseJsonFromGemini } from "./parseJsonFromGemini.js";
import { CATEGORIES } from "../models/Expense.js";
import { prepareImageForGemini, isRateLimitError } from "./imagePrep.js";

const GEMINI_TIMEOUT_MS = 25000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");
  return new GoogleGenerativeAI(apiKey);
}

function getPrimaryModel() {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out. Try again.")), ms)
    ),
  ]);
}

/** Save receipt even when Gemini is down — user can edit details. */
export function localReceiptFallback() {
  return {
    amount: 0,
    merchant: "Unknown (please edit)",
    category: "Food",
    date: new Date(),
    confidence: 35,
    usedFallback: true,
  };
}

/**
 * One model, no long retry chain — fails fast on quota errors.
 */
async function generateOnce(parts) {
  const modelName = getPrimaryModel();
  const model = getClient().getGenerativeModel({ model: modelName });
  const result = await model.generateContent(parts);
  return result.response.text();
}

function normalizeExtracted(data) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid amount from AI");
  }

  let category = typeof data.category === "string" ? data.category.trim() : "Other";
  if (!CATEGORIES.includes(category)) category = "Other";

  const merchant =
    typeof data.merchant === "string" && data.merchant.trim()
      ? data.merchant.trim()
      : "Unknown";

  let date = new Date(data.date);
  if (Number.isNaN(date.getTime())) date = new Date();

  let confidence = Number(data.confidence);
  if (!Number.isFinite(confidence)) confidence = 80;
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));

  return { amount, merchant, category, date, confidence, usedFallback: false };
}

/**
 * Extract receipt fields — tries Gemini once, then local fallback.
 */
export async function extractExpenseFromImage(source) {
  const { base64, mimeType } = await prepareImageForGemini(source);

  const prompt = `You analyze Indian receipt/bill photos. Extract structured expense data.

Categories (pick exactly one): ${CATEGORIES.join(", ")}.

Rules:
- amount: total bill amount as a number in Indian Rupees (INR). No currency symbols. Use the final payable total.
- merchant: store/brand/restaurant name; if unclear use "Unknown".
- category: must match one allowed label exactly.
- date: YYYY-MM-DD from the receipt; if missing use today.
- confidence: integer 0-100.

Respond with ONLY JSON:
{"amount":number,"merchant":string,"category":string,"date":string,"confidence":number}`;

  try {
    const text = await withTimeout(
      generateOnce([
        { text: prompt },
        { inlineData: { mimeType, data: base64 } },
      ]),
      GEMINI_TIMEOUT_MS
    );
    return normalizeExtracted(parseJsonFromGemini(text));
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn("Gemini extract failed:", msg.slice(0, 180));
    if (isRateLimitError(err)) {
      console.warn("Using local fallback due to API quota/rate limit");
    }
    return localReceiptFallback();
  }
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

  const text = await withTimeout(generateOnce([{ text: prompt }]), GEMINI_TIMEOUT_MS);
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
