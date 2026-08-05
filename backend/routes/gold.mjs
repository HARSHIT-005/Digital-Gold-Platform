// 🌟 Gold Price Routes
import express from "express";
import { isAdmin } from "../middlewares/isAdmin.mjs";
import { protect } from "../middlewares/auth.mjs";
import {
  getCurrentPrice,
  updatePrice,
  getPriceHistory,
  getPublicPriceHistory
} from "../controllers/goldPriceController.mjs";

const router = express.Router();

// 🟡 Route: Get current gold price (public)
router.get("/price", getCurrentPrice);

// 🟢 Route: Update gold price (admin only)
router.post("/update-price", protect, isAdmin, updatePrice);

// 🔸 Route: Get price history (admin only - with full details)
router.get("/price-history", protect, isAdmin, getPriceHistory);

// 🔵 Route: Get public price history (for users - chart data)
router.get("/price-history/public", getPublicPriceHistory);

export default router;
