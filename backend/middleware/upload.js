import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "uploads");
const isVercel = Boolean(process.env.VERCEL);

if (!isVercel && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMime = new Set(["image/jpeg", "image/png"]);

function fileFilter(req, file, cb) {
  const okMime = allowedMime.has(file.mimetype);
  const ext = path.extname(file.originalname).toLowerCase();
  const okExt = [".jpg", ".jpeg", ".png"].includes(ext);
  if (okMime && okExt) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, and PNG images are allowed"));
  }
}

// Vercel serverless: memory only (no persistent disk)
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        const safeExt = [".jpg", ".jpeg", ".png"].includes(ext) ? ext : ".jpg";
        cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
      },
    });

export const uploadReceipt = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter,
});

export { uploadsDir, isVercel };
