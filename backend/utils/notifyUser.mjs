// 🔔 Notification Utility — minor formatting update only
import Notification from "../models/Notification.mjs";

export const notifyUser = async (userId, message) => {
  try {
    // 📨 Save a new notification for the user
    await Notification.create({ userId, message });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};
