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
allowedOrigins.push("https://expenses-sigma-one.vercel.app");

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

// Health check — no DB (fast for Vercel cold starts)
app.get("/health", (req, res) => {
  res.json({ ok: true, platform: process.env.VERCEL ? "vercel" : "local" });
});

// Connect MongoDB only for API routes that need it
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connect error:", err.message);
    const msg =
      err.message?.includes("Missing MONGODB_URI")
        ? "Server database not configured (MONGODB_URI missing)"
        : err.message?.includes("timed out") || err.message?.includes("Server selection timed out")
          ? "Database is slow to respond — please try again in a few seconds"
          : "Database connection failed";
    res.status(503).json({ error: msg });
  }
});

app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/summary", summaryRoutes);
app.use("/notifications", notificationRoutes);

export default app;
