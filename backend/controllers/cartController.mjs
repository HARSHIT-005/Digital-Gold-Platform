// 🛒 Order Cart Controller
import mongoose from "mongoose";
import User from "../models/User.mjs";
import GoldInventory from "../models/GoldInventory.mjs";
import OrderCart from "../models/OrderCart.mjs";
import Transaction from "../models/Transaction.mjs";
import CustomerHolding from "../models/CustomerHolding.mjs";
import { notifyUser } from "../utils/notifyUser.mjs";
import { logAudit } from "../utils/logAudit.mjs";
import { getCurrentPriceFromDB } from "../controllers/goldPriceController.mjs";

// ✅ Add item to cart (called when verified user tries to buy gold)
export const addToCart = async (req, res, next) => {
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

    // ✅ Create new cart entry
    const cart = await OrderCart.create({
      customerId,
      grams,
      pricePerGram,
      totalAmount,
      status: 'pending',
    });

    await logAudit({
      action: "add_to_cart",
      performedBy: customerId,
      targetModel: "OrderCart",
      targetId: cart._id,
      changes: { grams, totalAmount, pricePerGram },
    });

    return res.status(201).json({
      success: true,
      message: "Item added to cart successfully",
      cart,
    });
  } catch (err) {
    console.error("Add to cart error:", err);
    next(err);
  }
};

// ✅ Get user's cart
export const getMyCart = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    const cart = await OrderCart.findOne({
      customerId,
      status: 'pending',
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "No active cart found",
        cart: null,
      });
    }

    // Check if cart has expired
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      cart.status = 'expired';
      cart.isDeleted = true;
      await cart.save();
      return res.status(200).json({
        success: true,
        message: "Cart has expired",
        cart: null,
      });
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (err) {
    console.error("Get cart error:", err);
    next(err);
  }
};

// ✅ Checkout cart (complete the purchase)
export const checkoutCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;

    // ✅ Get active cart
    const cart = await OrderCart.findOne({
      customerId,
      status: 'pending',
      isDeleted: false,
    }).session(session);

    if (!cart) {
      throw new Error("No active cart found");
    }

    // ✅ Check if cart has expired
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      cart.status = 'expired';
      cart.isDeleted = true;
      await cart.save({ session });
      throw new Error("Cart has expired. Please add items to cart again.");
    }

    // ✅ Ensure user still has verified KYC
    const user = await User.findById(customerId).session(session);
    if (!user || !user.kyc?.verified) {
      throw new Error("KYC not verified. Cannot proceed with purchase.");
    }

    // ✅ Re-validate current price and inventory
    const currentPricePerGram = await getCurrentPriceFromDB();
    const inventory = await GoldInventory.findOne({ isDeleted: false }).session(session);
    
    if (!inventory || inventory.availableGrams < cart.grams) {
      throw new Error("Insufficient gold inventory");
    }

    // ✅ Recalculate total amount with current price
    const totalAmount = parseFloat((currentPricePerGram * cart.grams).toFixed(2));

    // ✅ Create transaction record
    const [transaction] = await Transaction.create(
      [
        {
          customerId,
          type: "buy",
          grams: cart.grams,
          pricePerGram: currentPricePerGram,
          totalAmount,
          status: "success",
          transactionTime: new Date(),
        },
      ],
      { session }
    );

    // ✅ Update or create customer's gold holding
    let holding = await CustomerHolding.findOne({
      customerId,
      isDeleted: false,
    }).session(session);

    if (holding) {
      const totalGrams = holding.totalGrams + cart.grams;
      const weightedAvg =
        (holding.totalGrams * holding.averagePricePerGram + totalAmount) / totalGrams;

      holding.totalGrams = parseFloat(totalGrams.toFixed(4));
      holding.averagePricePerGram = parseFloat(weightedAvg.toFixed(2));
      holding.totalInvested = parseFloat(
        (holding.totalGrams * holding.averagePricePerGram).toFixed(2)
      );
      holding.lastTransactionAt = new Date();

      await holding.save({ session });
    } else {
      await CustomerHolding.create(
        [
          {
            customerId,
            totalGrams: parseFloat(cart.grams.toFixed(4)),
            averagePricePerGram: currentPricePerGram,
            totalInvested: parseFloat(
              (cart.grams * currentPricePerGram).toFixed(2)
            ),
            isDeleted: false,
            lastTransactionAt: new Date(),
          },
        ],
        { session }
      );
    }

    // ✅ Deduct inventory
    inventory.availableGrams -= cart.grams;
    await inventory.save({ session });

    // ✅ Update cart status
    cart.status = 'completed';
    cart.completedAt = new Date();
    cart.isDeleted = true;
    await cart.save({ session });

    // ✅ Notify user & log audit entry
    await notifyUser(customerId, `You purchased ${cart.grams} grams of gold for ₹${totalAmount}.`);
    await logAudit({
      action: "checkout_cart",
      performedBy: customerId,
      targetModel: "Transaction",
      targetId: transaction._id,
      changes: { grams: cart.grams, totalAmount },
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Gold purchase successful",
      transaction,
      cart,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// ✅ Cancel cart
export const cancelCart = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    const cart = await OrderCart.findOne({
      customerId,
      status: 'pending',
      isDeleted: false,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "No active cart found",
      });
    }

    cart.status = 'cancelled';
    cart.isDeleted = true;
    await cart.save();

    await logAudit({
      action: "cancel_cart",
      performedBy: customerId,
      targetModel: "OrderCart",
      targetId: cart._id,
      changes: { status: 'cancelled' },
    });

    return res.status(200).json({
      success: true,
      message: "Cart cancelled successfully",
    });
  } catch (err) {
    console.error("Cancel cart error:", err);
    next(err);
  }
};

