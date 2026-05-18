import express from "express";
import fs from "fs";
import path from "path";
import Expense from "../models/Expense.js";
import { uploadReceipt, uploadsDir, isVercel } from "../middleware/upload.js";
import { prepareImageForGemini } from "../utils/imagePrep.js";
import { authRequired } from "../middleware/auth.js";
import { extractExpenseFromImage, publicImagePath } from "../utils/gemini.js";
import { createNotification } from "../utils/notify.js";
import { formatINR } from "../utils/formatMoney.js";

const router = express.Router();
router.use(authRequired);

function userFilter(userId, extra = {}) {
  return { user: userId, ...extra };
}

/**
 * POST /expenses/upload
 */
router.post("/upload", (req, res) => {
  uploadReceipt.single("receipt")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded (field name: receipt)" });
    }

    const filePath = req.file.path;
    const imageSource = req.file.buffer || filePath;

    try {
      const extracted = await extractExpenseFromImage(imageSource);

      let imageUrl;
      if (isVercel || req.file.buffer) {
        const { base64, mimeType } = await prepareImageForGemini(req.file.buffer);
        imageUrl = `data:${mimeType};base64,${base64}`;
      } else {
        imageUrl = publicImagePath(req.file.filename);
      }

      const expense = await Expense.create({
        user: req.userId,
        image: imageUrl,
        amount: extracted.amount,
        merchant: extracted.merchant,
        category: extracted.category,
        date: extracted.date,
        confidence: extracted.confidence,
      });

      const notifMsg = extracted.usedFallback
        ? "AI quota busy — receipt saved. Please edit amount & merchant."
        : `${extracted.merchant} — ${formatINR(extracted.amount)} (${extracted.category})`;

      await createNotification(req.userId, {
        title: extracted.usedFallback ? "Receipt saved (manual edit needed)" : "Receipt processed",
        message: notifMsg,
        type: extracted.usedFallback ? "warning" : "expense",
      });

      return res.status(201).json({
        ...expense.toObject(),
        usedFallback: Boolean(extracted.usedFallback),
        message: extracted.usedFallback
          ? "AI quota reached. Bill saved — click Edit to enter the correct amount."
          : undefined,
      });
    } catch (e) {
      if (filePath && !req.file.buffer) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          /* ignore */
        }
      }
      console.error("Upload error:", e);
      return res.status(500).json({ error: e.message || "Failed to save receipt" });
    }
  });
});

/**
 * GET /expenses
 */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = userFilter(req.userId);
    if (category && typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }
    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load expenses" });
  }
});

/**
 * PUT /expenses/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { amount, merchant, category, date } = req.body;
    const update = {};

    if (amount !== undefined) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      update.amount = n;
    }
    if (merchant !== undefined) update.merchant = String(merchant);
    if (category !== undefined) update.category = String(category);
    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      update.date = d;
    }

    const expense = await Expense.findOneAndUpdate(
      userFilter(req.userId, { _id: req.params.id }),
      update,
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await createNotification(req.userId, {
      title: "Expense updated",
      message: `${expense.merchant} — ${formatINR(expense.amount)}`,
      type: "info",
    });

    res.json(expense);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

/**
 * DELETE /expenses/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOne(userFilter(req.userId, { _id: req.params.id }));
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const rel = expense.image;
    if (rel && rel.startsWith("/uploads/")) {
      const filename = path.basename(rel);
      const diskPath = path.join(uploadsDir, filename);
      try {
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      } catch {
        /* ignore */
      }
    }

    await expense.deleteOne();

    await createNotification(req.userId, {
      title: "Expense deleted",
      message: `Removed ${expense.merchant} (${formatINR(expense.amount)})`,
      type: "warning",
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
