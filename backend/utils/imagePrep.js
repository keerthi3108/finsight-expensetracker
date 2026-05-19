import fs from "fs";

async function compressBuffer(buffer) {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buffer)
      .rotate()
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { base64: out.toString("base64"), mimeType: "image/jpeg" };
  } catch (err) {
    console.warn("Sharp compress failed:", err.message);
    return {
      base64: buffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  }
}

/**
 * Prepare image for Gemini from file path, buffer, or multer file object.
 */
export async function prepareImageForGemini(source) {
  if (Buffer.isBuffer(source)) {
    return compressBuffer(source);
  }
  if (source?.buffer) {
    return compressBuffer(source.buffer);
  }
  if (typeof source === "string") {
    const buffer = fs.readFileSync(source);
    const ext = source.toLowerCase();
    const mimeType = ext.endsWith(".png") ? "image/png" : "image/jpeg";
    const { base64 } = await compressBuffer(buffer);
    return { base64, mimeType };
  }
  throw new Error("Invalid image source");
}

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

export function getModelFallbackList() {
  const fromEnv = process.env.GEMINI_MODEL;
  const defaults = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];
  if (fromEnv) return [fromEnv, ...defaults.filter((m) => m !== fromEnv)];
  return defaults;
}
