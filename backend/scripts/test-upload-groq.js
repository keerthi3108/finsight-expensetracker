import "../loadEnv.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const API = "http://localhost:5000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svg = `<svg width="420" height="520" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="24" y="48" font-size="24" font-family="Arial" fill="black">GROQ LIVE TEST</text>
  <text x="24" y="360" font-size="20" font-weight="bold" fill="black">GRAND TOTAL Rs 888.00</text>
</svg>`;

const tmp = path.join(__dirname, "..", "uploads", "live-groq.png");
await fs.promises.mkdir(path.dirname(tmp), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(tmp);

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "finsight.test@example.com", password: "test1234" }),
});
const { token } = await login.json();
if (!token) {
  console.error("Login failed");
  process.exit(1);
}

const buf = await fs.promises.readFile(tmp);
const fd = new FormData();
fd.append("receipt", new Blob([buf], { type: "image/png" }), "live-groq.png");

const up = await fetch(`${API}/expenses/upload`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: fd,
});
const data = await up.json();
console.log("Upload status:", up.status);
console.log("parseSource:", data.parseSource);
console.log("amount:", data.amount, "| merchant:", data.merchant, "| confidence:", data.confidence);
if (data.parseSource !== "groq") process.exit(1);
