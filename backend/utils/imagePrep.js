import sharp from "sharp";
import fs from "fs";

/**
 * Resize & compress receipt images before Gemini to reduce tokens and avoid quota issues.
 */
export async function prepareImageForGemini(filePath) {
  try {
    const buffer = await sharp(filePath)
      .rotate()
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return {
      base64: buffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch (err) {
    console.warn("Sharp compress failed, using original file:", err.message);
    const buffer = fs.readFileSync(filePath);
    const ext = filePath.toLowerCase();
    const mimeType = ext.endsWith(".png") ? "image/png" : "image/jpeg";
    return { base64: buffer.toString("base64"), mimeType };
  }
}

/** Parse "Please retry in 5.18s" from Gemini error text. */
export function parseRetryDelayMs(message) {
  const match = String(message).match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  return 6000;
}

export function isRateLimitError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("resource exhausted")
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Models that typically work on Gemini free tier (tried in order). */
export function getModelFallbackList() {
  const fromEnv = process.env.GEMINI_MODEL;
  const defaults = [
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ];
  if (fromEnv) {
    return [fromEnv, ...defaults.filter((m) => m !== fromEnv)];
  }
  return defaults;
}
