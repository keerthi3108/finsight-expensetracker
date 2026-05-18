import express from "express";
import Expense from "../models/Expense.js";
import { generateSpendingSummary } from "../utils/gemini.js";
import { buildLocalSummary } from "../utils/localSummary.js";
import { isRateLimitError } from "../utils/imagePrep.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.userId }).sort({ date: -1 });
    const local = buildLocalSummary(expenses);

    if (expenses.length === 0) {
      return res.json(local);
    }

    const wantAi = req.query.ai === "1" || req.query.refresh === "1";
    if (!wantAi) {
      return res.json(local);
    }

    try {
      const summary = await generateSpendingSummary(expenses);
      return res.json(summary);
    } catch (e) {
      console.warn("Gemini summary failed, using local fallback:", e.message?.slice(0, 120));
      return res.json({
        ...local,
        reminders: [
          isRateLimitError(e)
            ? "AI quota reached — showing computed insights. Retry in a minute."
            : "AI unavailable — showing computed insights.",
          ...local.reminders.slice(0, 1),
        ],
      });
    }
  } catch (e) {
    console.error("Summary error:", e);
    res.status(500).json({ error: e.message || "Failed to load summary" });
  }
});

export default router;
