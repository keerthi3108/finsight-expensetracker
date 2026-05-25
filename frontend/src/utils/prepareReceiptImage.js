/**
 * Upscale small/blurry receipt photos before upload so OCR/AI can read them.
 */
const MIN_WIDTH = 1600;
const MAX_DIMENSION = 3200;
const JPEG_QUALITY = 0.92;

export async function prepareReceiptFile(file) {
  if (!file?.type?.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  if (width >= MIN_WIDTH && width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(
    Math.max(MIN_WIDTH / width, 1),
    MAX_DIMENSION / Math.max(width, height)
  );
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process image"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "") || "receipt";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
