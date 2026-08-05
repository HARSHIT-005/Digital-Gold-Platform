// 🔔 Notification model (minor formatting update)
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { versionKey: false } // 🧩 added harmless option (no logic change)
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
