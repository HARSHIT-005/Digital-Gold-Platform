// 📂 Holding Routes — minor formatting & comment changes only
import express from "express";
import { protect } from "../middlewares/auth.mjs";
import { getMyHoldings } from "../controllers/holdingController.mjs";

const router = express.Router();

// 🟢 Route: Get current user's gold holdings
router.get("/me", protect, getMyHoldings);

// ✅ Export router (no logic modified)
export default router;
