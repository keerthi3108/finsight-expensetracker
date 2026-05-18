import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authRequired, loadUser } from "../middleware/auth.js";
import { createNotification } from "../utils/notify.js";

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

/**
 * POST /auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    await createNotification(user._id, {
      title: "Welcome to FinSight AI",
      message: "Your account is ready. Upload your first receipt to start tracking expenses in ₹.",
      type: "success",
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeJSON() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /auth/me
 */
router.get("/me", authRequired, loadUser, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

/**
 * PUT /auth/profile
 */
router.put("/profile", authRequired, loadUser, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (name !== undefined) req.user.name = String(name).trim();
    if (email !== undefined) {
      const nextEmail = String(email).trim().toLowerCase();
      const taken = await User.findOne({ email: nextEmail, _id: { $ne: req.user._id } });
      if (taken) {
        return res.status(400).json({ error: "Email already in use" });
      }
      req.user.email = nextEmail;
    }
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * PUT /auth/password
 */
router.put("/password", authRequired, loadUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    if (!(await req.user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    req.user.password = newPassword;
    await req.user.save();
    res.json({ ok: true, message: "Password updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update password" });
  }
});

export default router;
