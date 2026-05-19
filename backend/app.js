import "./loadEnv.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import expenseRoutes from "./routes/expenses.js";
import summaryRoutes from "./routes/summary.js";
import notificationRoutes from "./routes/notifications.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET not set — using dev default.");
  process.env.JWT_SECRET = "finsight-dev-secret-change-me";
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}
// Vercel preview/production same-origin
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // allow same-origin / server-side
      }
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "10mb" }));

// Local dev: serve uploaded files from disk
if (!process.env.VERCEL) {
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
}

// Connect MongoDB before API routes (works for serverless + local)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connect error:", err.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/summary", summaryRoutes);
app.use("/notifications", notificationRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true, platform: process.env.VERCEL ? "vercel" : "local" });
});

export default app;
