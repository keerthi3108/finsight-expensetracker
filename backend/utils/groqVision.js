import { parseJsonFromGemini } from "./parseJsonFromGemini.js";
import { normalizeGeminiPayload } from "./receiptParse.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const RECEIPT_PROMPT = `You are an expert OCR system for Indian retail receipts, restaurant bills, pharmacy bills, and GST invoices.

Read the attached image carefully. Extract:
1. amount — FINAL amount the customer paid in INR (number only). Look for: GRAND TOTAL, NET AMOUNT, TOTAL, AMOUNT PAID, BALANCE, Bill Amount.
2. merchant — shop/restaurant/pharmacy name (usually top of bill).
3. category — exactly one of: Food, Travel, Shopping, Medical, Bills, Recharge, Entertainment, Other.
4. date — transaction date as YYYY-MM-DD from the bill (not today's date unless printed on bill).
5. confidence — 0-100 how sure you are.

Never return amount 0 unless the bill truly shows zero.

Respond with ONLY valid JSON:
{"amount":number,"merchant":string,"category":string,"date":"YYYY-MM-DD","confidence":number}`;

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

/**
 * Extract receipt fields using Groq vision (Llama 4 Scout).
 * @see https://console.groq.com/docs/vision
 */
export async function extractExpenseFromGroq(base64, mimeType) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: RECEIPT_PROMPT },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 240)}`);
  }

  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  const parsed = normalizeGeminiPayload(parseJsonFromGemini(text));
  return { ...parsed, source: "groq" };
}
