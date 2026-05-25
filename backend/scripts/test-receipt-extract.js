import "../loadEnv.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { extractExpenseFromImage } from "../utils/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svg = `<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="20" y="40" font-size="22" font-family="Arial" fill="black">SRI VENKATESWARA HOTEL</text>
  <text x="20" y="80" font-size="14" fill="black">Date: 15/03/2025</text>
  <text x="20" y="200" font-size="14" fill="black">Biryani x2  320.00</text>
  <text x="20" y="280" font-size="18" font-weight="bold" fill="black">GRAND TOTAL  Rs 450.00</text>
</svg>`;

const tmp = path.join(__dirname, "..", "uploads", "test-receipt.png");
await fs.promises.mkdir(path.dirname(tmp), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(tmp);

const result = await extractExpenseFromImage(tmp);
console.log(
  JSON.stringify(
    { ...result, date: result.date instanceof Date ? result.date.toISOString() : result.date },
    null,
    2
  )
);
