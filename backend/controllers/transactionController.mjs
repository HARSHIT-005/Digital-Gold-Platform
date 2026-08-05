// 💰 Gold Transaction Controller
import mongoose from "mongoose";
import User from "../models/User.mjs";
import GoldInventory from "../models/GoldInventory.mjs";
import Transaction from "../models/Transaction.mjs";
import CustomerHolding from "../models/CustomerHolding.mjs";
import OrderCart from "../models/OrderCart.mjs";
import { notifyUser } from "../utils/notifyUser.mjs";
import { logAudit } from "../utils/logAudit.mjs";
import { getCurrentPriceFromDB } from "../controllers/goldPriceController.mjs";

export const buyGold = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { grams } = req.body;

    // ✅ Validate input grams
    if (!grams || grams <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid gold quantity",
      });
    }

    // ✅ Ensure user has verified KYC
    const user = await User.findById(customerId);
    if (!user || !user.kyc?.verified) {
      return res.status(403).json({
        success: false,
        message: "KYC not verified. Cannot proceed with purchase.",
      });
    }

    // ✅ Fetch current gold price (per gram) from database
    const pricePerGram = await getCurrentPriceFromDB();
    const totalAmount = parseFloat((pricePerGram * grams).toFixed(2));

    // ✅ Check gold inventory availability
    const inventory = await GoldInventory.findOne({ isDeleted: false });
    if (!inventory || inventory.availableGrams < grams) {
      return res.status(400).json({
        success: false,
        message: "Insufficient gold inventory",
      });
    }

    // ✅ Cancel any existing pending carts for this user
    await OrderCart.updateMany(
      { customerId, status: 'pending', isDeleted: false },
      { status: 'cancelled', isDeleted: true }
    );

    // ✅ Create order cart when verified user tries to buy gold
    const cart = await OrderCart.create({
      customerId,
      grams,
      pricePerGram,
      totalAmount,
      status: 'pending',
    });

    await logAudit({
      action: "buy_gold_cart_created",
      performedBy: customerId,
      targetModel: "OrderCart",
      targetId: cart._id,
      changes: { grams, totalAmount, pricePerGram },
    });

    return res.status(201).json({
      success: true,
      message: "Order cart created successfully. Please proceed to checkout.",
      cart,
    });
  } catch (err) {
    console.error("Buy gold (create cart) error:", err);
    next(err);
  }
};

export const sellGold = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;
    const { grams } = req.body;

    // ✅ Validate grams
    if (!grams || grams <= 0) throw new Error("Invalid gold quantity");

    // ✅ Verify KYC before selling
    const user = await User.findById(customerId).session(session);
    if (!user || !user.kyc?.verified) {
      throw new Error("KYC not verified. Cannot proceed with sale.");
    }

    // ✅ Check user’s current holdings
    let holding = await CustomerHolding.findOne({
      customerId,
      isDeleted: false,
    }).session(session);

    if (!holding || holding.totalGrams < grams) {
      throw new Error("Insufficient gold balance to sell");
    }

    // ✅ Fetch current gold price from database
    const pricePerGram = await getCurrentPriceFromDB();
    const totalAmount = parseFloat((pricePerGram * grams).toFixed(2));

    // ✅ Record the sell transaction
    const [transaction] = await Transaction.create(
      [
        {
          customerId,
          type: "sell",
          grams,
          pricePerGram,
          totalAmount,
          status: "success",
          createdAt: new Date(),
        },
      ],
      { session }
    );

    // ✅ Update holdings after sale
    holding.totalGrams = parseFloat((holding.totalGrams - grams).toFixed(4));
    holding.lastTransactionAt = new Date();
    if (holding.totalGrams <= 0) {
      holding.totalGrams = 0;
      holding.totalInvested = 0;
    } else {
      holding.totalInvested = parseFloat(
        (holding.totalGrams * holding.averagePricePerGram).toFixed(2)
      );
    }
    await holding.save({ session });

    // ✅ Add sold gold back to inventory
    let inventory = await GoldInventory.findOne({ isDeleted: false }).session(session);
    if (!inventory) {
      inventory = await GoldInventory.create([{ availableGrams: grams }], { session });
    } else {
      inventory.availableGrams += grams;
      await inventory.save({ session });
    }

    // ✅ Notify & audit
    await notifyUser(customerId, `You sold ${grams} grams of gold for ₹${totalAmount}.`);
    await logAudit({
      action: "sell_gold",
      performedBy: customerId,
      targetModel: "Transaction",
      targetId: transaction._id,
      changes: { grams, totalAmount },
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Gold sale successful",
      transaction,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

export const getMyTransactions = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    // 🧾 Fetch user’s transaction history
    const transactions = await Transaction.find({ customerId }).sort({
      transactionTime: -1,
    });

    res.status(200).json({ success: true, transactions });
  } catch (err) {
    next(err);
  }
};
