import express from "express";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired);

/**
 * GET /notifications
 */
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

/**
 * GET /notifications/unread-count
 */
router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.userId, read: false });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: "Failed to count notifications" });
  }
});

/**
 * PATCH /notifications/read-all
 */
router.patch("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ user: req.userId, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

/**
 * PATCH /notifications/:id/read
 */
router.patch("/:id/read", async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: "Notification not found" });
    res.json(n);
  } catch (e) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

/**
 * DELETE /notifications/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const n = await Notification.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!n) return res.status(404).json({ error: "Notification not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
