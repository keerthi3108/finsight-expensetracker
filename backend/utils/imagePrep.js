import fs from "fs";

async function getSharp() {
  return (await import("sharp")).default;
}

async function readInputBuffer(source) {
  if (Buffer.isBuffer(source)) return source;
  if (source?.buffer) return source.buffer;
  if (typeof source === "string") return fs.readFileSync(source);
  throw new Error("Invalid image source");
}

/** Standard enhanced JPEG for Gemini / Groq vision APIs. */
async function enhanceReceiptBuffer(buffer) {
  const sharp = await getSharp();
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 0;

  let pipeline = sharp(buffer).rotate();
  // Upscale small phone thumbnails so text is readable
  if (w > 0 && w < 1400) {
    const target = Math.min(2400, Math.round((1400 / w) * w));
    pipeline = pipeline.resize(target, null, { fit: "inside", kernel: "lanczos3" });
  } else {
    pipeline = pipeline.resize(2400, 2400, { fit: "inside", withoutEnlargement: true });
  }

  return pipeline.normalize().sharpen({ sigma: 1.4 }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
}

async function compressBuffer(buffer) {
  try {
    const out = await enhanceReceiptBuffer(buffer);
    return { buffer: out, base64: out.toString("base64"), mimeType: "image/jpeg" };
  } catch (err) {
    console.warn("Sharp compress failed:", err.message);
    return {
      buffer,
      base64: buffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  }
}

/**
 * Multiple preprocessed variants for local OCR (normal, high contrast, binary).
 */
export async function getOcrImageVariants(source) {
  const input = await readInputBuffer(source);
  const sharp = await getSharp();
  const meta = await sharp(input).metadata();
  const w = meta.width || 800;

  let base = sharp(input).rotate();
  if (w < 1400) {
    const targetW = Math.min(2600, Math.round(1400 * (1400 / Math.max(w, 1))));
    base = base.resize(targetW, null, { fit: "inside", kernel: "lanczos3" });
  } else {
    base = base.resize(2600, 2600, { fit: "inside", withoutEnlargement: true });
  }

  const enhanced = await base
    .clone()
    .normalize()
    .sharpen({ sigma: 1.6 })
    .jpeg({ quality: 94 })
    .toBuffer();

  const contrast = await base
    .clone()
    .grayscale()
    .normalize()
    .linear(1.5, -48)
    .sharpen()
    .png()
    .toBuffer();

  const binary = await base.clone().grayscale().threshold(140).png().toBuffer();

  return [enhanced, contrast, binary];
}

/** JPEG buffer for OCR (primary enhanced variant). */
export async function getImageBuffer(source) {
  const input = await readInputBuffer(source);
  const { buffer } = await compressBuffer(input);
  return buffer;
}

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
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const defaults = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
  ];
  if (fromEnv) return [fromEnv, ...defaults.filter((m) => m !== fromEnv)];
  return defaults;
}
