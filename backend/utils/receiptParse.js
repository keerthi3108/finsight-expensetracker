import { CATEGORIES } from "../models/Expense.js";

/** Parse ₹1,234.56 / Rs 500 / "1234.50" / 1234 */
export function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (value == null) return NaN;
  let s = String(value).trim();
  if (!s) return NaN;
  s = s.replace(/₹|rs\.?|inr/gi, "").replace(/,/g, "").replace(/\s+/g, " ");
  const totalMatch = s.match(/(\d+(?:\.\d{1,2})?)/);
  return totalMatch ? parseFloat(totalMatch[1]) : NaN;
}

/** DD/MM/YYYY, DD-MM-YY, YYYY-MM-DD */
export function parseReceiptDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let year = +dmy[3];
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, +dmy[2] - 1, +dmy[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeCategory(raw) {
  let category = typeof raw === "string" ? raw.trim() : "Other";
  const lower = category.toLowerCase();
  const map = {
    food: "Food",
    restaurant: "Food",
    grocery: "Food",
    travel: "Travel",
    transport: "Travel",
    cab: "Travel",
    uber: "Travel",
    shopping: "Shopping",
    retail: "Shopping",
    medical: "Medical",
    pharmacy: "Medical",
    hospital: "Medical",
    bills: "Bills",
    utility: "Bills",
    electricity: "Bills",
    recharge: "Recharge",
    mobile: "Recharge",
    entertainment: "Entertainment",
    movie: "Entertainment",
  };
  if (map[lower]) return map[lower];
  if (CATEGORIES.includes(category)) return category;
  for (const c of CATEGORIES) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  return "Other";
}

const TOTAL_KEYWORDS =
  /(?:grand\s*)?total|net\s*amount|amount\s*paid|payable|balance\s*due|bill\s*amount|invoice\s*total|total\s*due|total\s*amt|g\.?\s*total|final\s*amount|to\s*pay|cash\s*paid/i;

const GST_RATES = new Set([5, 9, 12, 18, 28]);

function amountsFromLine(line) {
  const normalized = line.replace(/,/g, "");
  return [...normalized.matchAll(/(\d+(?:\.\d{2})?)/g)]
    .map((m) => parseFloat(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function isLikelyGstOnly(amounts) {
  return amounts.length === 1 && GST_RATES.has(amounts[0]);
}

/**
 * Parse Indian receipt OCR text into expense fields.
 */
export function parseIndianReceiptText(text, ocrConfidence = 55) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let amount = NaN;
  const amountCandidates = [];
  const bottomStart = Math.floor(lines.length * 0.45);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const amounts = amountsFromLine(line);
    if (!amounts.length || isLikelyGstOnly(amounts)) continue;

    const lineAmount = amounts[amounts.length - 1];
    const posBoost = i >= bottomStart ? 25 : 0;

    if (TOTAL_KEYWORDS.test(line)) {
      amountCandidates.push({ value: lineAmount, weight: 100 + posBoost });
    }
    if (/₹|rs\.?|inr/i.test(line)) {
      amountCandidates.push({ value: lineAmount, weight: 85 + posBoost });
    }
    if (i >= bottomStart) {
      amountCandidates.push({ value: lineAmount, weight: 40 + posBoost });
    }

    // "TOTAL" on one line, amount on the next
    if (TOTAL_KEYWORDS.test(line) && i + 1 < lines.length) {
      const nextAmounts = amountsFromLine(lines[i + 1]);
      if (nextAmounts.length && !isLikelyGstOnly(nextAmounts)) {
        amountCandidates.push({
          value: nextAmounts[nextAmounts.length - 1],
          weight: 115 + posBoost,
        });
      }
    }
  }

  if (amountCandidates.length) {
    amountCandidates.sort((a, b) => b.weight - a.weight || b.value - a.value);
    amount = amountCandidates[0].value;
  } else {
    // Last resort: largest amount in bottom half (often the total)
    const tail = lines.slice(bottomStart).join(" ");
    const tailAmounts = amountsFromLine(tail).filter((n) => n >= 10);
    if (tailAmounts.length) {
      amount = Math.max(...tailAmounts);
    }
  }

  let date = null;
  for (const line of lines) {
    const dm = line.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (dm) {
      date = parseReceiptDate(dm[0]);
      if (date) break;
    }
    const iso = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      date = parseReceiptDate(iso[0]);
      if (date) break;
    }
  }
  if (!date) date = new Date();

  let merchant = "Unknown";
  for (const line of lines.slice(0, 8)) {
    if (line.length < 3 || line.length > 60) continue;
    if (/^(gst|cin|phone|tel|bill|invoice|date|time|total|amount|qty)/i.test(line)) continue;
    if (/^\d+[\d\s\-/.]*$/.test(line)) continue;
    merchant = line.slice(0, 80);
    break;
  }

  let category = "Other";
  const blob = lines.join(" ").toLowerCase();
  if (/restaurant|cafe|food|hotel|swiggy|zomato|dominos|pizza|biryani/i.test(blob)) {
    category = "Food";
  } else if (/petrol|fuel|uber|ola|metro|irctc|travel|flight/i.test(blob)) {
    category = "Travel";
  } else if (/medical|pharmacy|hospital|clinic|apollo/i.test(blob)) {
    category = "Medical";
  } else if (/recharge|airtel|jio|vi\b|prepaid/i.test(blob)) {
    category = "Recharge";
  } else if (/amazon|flipkart|mart|store|shopping/i.test(blob)) {
    category = "Shopping";
  }

  const conf = Math.min(92, Math.max(40, Math.round(ocrConfidence)));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    amount,
    merchant,
    category: normalizeCategory(category),
    date,
    confidence: conf,
    usedFallback: true,
    source: "ocr",
  };
}

export function normalizeGeminiPayload(data) {
  const amount = parseAmount(data.amount ?? data.total ?? data.totalAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount from AI");
  }

  const merchant =
    typeof data.merchant === "string" && data.merchant.trim()
      ? data.merchant.trim()
      : typeof data.store === "string" && data.store.trim()
        ? data.store.trim()
        : "Unknown";

  const category = normalizeCategory(data.category);
  let date = parseReceiptDate(data.date);
  if (!date) date = new Date();

  let confidence = Number(data.confidence);
  if (!Number.isFinite(confidence)) confidence = 85;
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));

  return {
    amount,
    merchant,
    category,
    date,
    confidence,
    usedFallback: false,
    source: "gemini",
  };
}
