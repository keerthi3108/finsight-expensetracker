import Notification from "../models/Notification.js";

export async function createNotification(userId, { title, message, type = "info" }) {
  try {
    return await Notification.create({ user: userId, title, message, type });
  } catch (e) {
    console.warn("Notification create failed:", e.message);
    return null;
  }
}
