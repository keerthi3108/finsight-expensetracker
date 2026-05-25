import "../backend/loadEnv.js";
import { connectDB } from "../backend/db.js";

/** Debug: test MongoDB from Vercel (remove in production if desired). */
export default async function handler(req, res) {
  const start = Date.now();
  try {
    await connectDB();
    res.status(200).json({ ok: true, db: "connected", ms: Date.now() - start });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err.message,
      ms: Date.now() - start,
      hint: "Check MONGODB_URI on Vercel and Atlas Network Access (0.0.0.0/0)",
    });
  }
}
