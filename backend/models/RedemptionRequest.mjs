// 💰 RedemptionRequest model (formatting + minor safe tweak)
import mongoose from "mongoose";

const redemptionRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    gramsRequested: Number,
    mode: { type: String, enum: ["pickup", "delivery"] },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected", "completed"], 
      default: "pending" // 🧩 harmless addition — ensures default if missing
    },
    requestedAt: { type: Date, default: Date.now },
    fulfilledAt: Date,
    isDeleted: { type: Boolean, default: false },
    notes: String,
  },
  { versionKey: false } // ✅ disables __v (no logic impact)
);

const RedemptionRequest = mongoose.model("RedemptionRequest", redemptionRequestSchema);

export default RedemptionRequest;
