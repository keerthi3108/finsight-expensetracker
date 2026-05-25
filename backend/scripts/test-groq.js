import "../loadEnv.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { hasGroqKey, extractExpenseFromGroq } from "../utils/groqVision.js";
import { prepareImageForGemini } from "../utils/imagePrep.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!hasGroqKey()) {
  console.error("GROQ_API_KEY is not set in backend/.env");
  process.exit(1);
}

const svg = `<svg width="420" height="520" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="24" y="48" font-size="24" font-family="Arial" fill="black">KRISHNA MART</text>
  <text x="24" y="90" font-size="16" fill="black">Date: 10/04/2025</text>
  <text x="24" y="360" font-size="20" font-weight="bold" fill="black">GRAND TOTAL Rs 599.00</text>
</svg>`;

const tmp = path.join(__dirname, "..", "uploads", "groq-test.png");
await fs.promises.mkdir(path.dirname(tmp), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(tmp);

const { base64, mimeType } = await prepareImageForGemini(tmp);
const result = await extractExpenseFromGroq(base64, mimeType);

console.log("Groq test OK:");
console.log(JSON.stringify({ ...result, date: result.date?.toISOString?.() }, null, 2));
