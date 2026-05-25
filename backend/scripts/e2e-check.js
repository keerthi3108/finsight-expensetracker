/**
 * End-to-end API check: health, login, receipt upload/extraction.
 */
import "../loadEnv.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const API = "http://localhost:5000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const results = { passed: [], failed: [] };

function pass(name, detail = "") {
  results.passed.push({ name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.failed.push({ name, detail });
  console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(method, urlPath, body, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let bodyInit;
  if (body instanceof FormData) {
    bodyInit = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(body);
  }
  const res = await fetch(`${API}${urlPath}`, { method, headers, body: bodyInit });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

// --- Health ---
try {
  const { status, data } = await request("GET", "/health");
  if (status === 200 && data.ok) pass("Health check", data.platform);
  else fail("Health check", `status ${status}`);
} catch (e) {
  fail("Health check", e.message);
  process.exit(1);
}

// --- Login (test account) ---
const testEmail = "finsight.test@example.com";
const testPassword = "test1234";
let token;

try {
  const { status, data } = await request("POST", "/auth/login", {
    email: testEmail,
    password: testPassword,
  });
  if (status === 200 && data.token) {
    token = data.token;
    pass("Login", `${data.user?.email}`);
  } else {
    fail("Login", data.error || `status ${status}`);
  }
} catch (e) {
  fail("Login", e.message);
}

// --- Register fallback if login failed ---
if (!token) {
  try {
    const { status, data } = await request("POST", "/auth/register", {
      name: "E2E Test",
      email: testEmail,
      password: testPassword,
    });
    if ((status === 201 || status === 200) && data.token) {
      token = data.token;
      pass("Register (new account)", testEmail);
    } else if (status === 400 && data.error?.includes("already")) {
      fail("Login", "Account exists but password may differ — use Sign up or reset in Atlas");
    } else {
      fail("Register", data.error || `status ${status}`);
    }
  } catch (e) {
    fail("Register", e.message);
  }
}

if (!token) {
  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.passed.length}, Failed: ${results.failed.length}`);
  process.exit(1);
}

// --- Auth me ---
try {
  const { status, data } = await request("GET", "/auth/me", null, token);
  if (status === 200 && data.user?.email) pass("Auth /me", data.user.name);
  else fail("Auth /me", `status ${status}`);
} catch (e) {
  fail("Auth /me", e.message);
}

// --- Create synthetic receipt PNG ---
const svg = `<svg width="420" height="520" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="24" y="48" font-size="24" font-family="Arial" fill="black">KRISHNA MART</text>
  <text x="24" y="90" font-size="16" fill="black">Date: 10/04/2025</text>
  <text x="24" y="300" font-size="16" fill="black">Items total  380.00</text>
  <text x="24" y="360" font-size="20" font-weight="bold" fill="black">GRAND TOTAL Rs 599.00</text>
</svg>`;
const receiptPath = path.join(__dirname, "..", "uploads", "e2e-test-receipt.png");
await fs.promises.mkdir(path.dirname(receiptPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(receiptPath);

// --- Upload receipt ---
try {
  const buf = await fs.promises.readFile(receiptPath);
  const fd = new FormData();
  fd.append("receipt", new Blob([buf], { type: "image/png" }), "e2e-test-receipt.png");

  const { status, data } = await request("POST", "/expenses/upload", fd, token);
  if (status === 201) {
    const okAmount = data.amount > 0;
    const okMerchant = data.merchant && !data.merchant.includes("Unknown (please edit)");
    const source = data.parseSource || (data.usedFallback ? "fallback" : "gemini");
    if (okAmount && okMerchant) {
      pass(
        "Bill extraction",
        `₹${data.amount} @ ${data.merchant} (${data.category}, ${data.confidence}%, source: ${source})`
      );
    } else if (data.amount > 0) {
      pass("Bill extraction (partial)", `₹${data.amount}, merchant: ${data.merchant}, source: ${source}`);
    } else {
      fail(
        "Bill extraction",
        `amount=${data.amount}, merchant=${data.merchant}, source=${source} — ${data.message || ""}`
      );
    }
  } else {
    fail("Bill upload", data.error || `status ${status}`);
  }
} catch (e) {
  fail("Bill upload", e.message);
}

// --- List expenses ---
try {
  const { status, data } = await request("GET", "/expenses", null, token);
  if (status === 200 && Array.isArray(data)) {
    pass("List expenses", `${data.length} record(s)`);
  } else {
    fail("List expenses", `status ${status}`);
  }
} catch (e) {
  fail("List expenses", e.message);
}

console.log("\n--- Summary ---");
console.log(`Passed: ${results.passed.length}, Failed: ${results.failed.length}`);
if (results.failed.length) {
  results.failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
  process.exit(1);
}
console.log("All checks passed.");
