// 👇 Admin Controller - minor formatting + comments (no logic change)
import User from "../models/User.mjs";
import CustomerHolding from "../models/CustomerHolding.mjs";
import AuditLog from "../models/AuditLog.mjs";
import { logAudit } from "../utils/logAudit.mjs";
import { notifyUser } from "../utils/notifyUser.mjs";
import bcrypt from "bcryptjs";

// Fetch all users with filters applied
export const getAllUsers = async (req, res, next) => {
  try {
    const { status, role, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status === "active") filter.isDeleted = false;
    else if (status === "deleted") filter.isDeleted = true;

    if (role) {
      filter.role = role;
    } else {
      filter.role = { $ne: "admin" };
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

// Soft delete user (mark as deleted)
export const softDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User soft deleted", user });

    await logAudit({
      action: "delete_user",
      performedBy: req.user._id,
      targetModel: "User",
      targetId: user._id,
      changes: { isDeleted: true },
    });
  } catch (err) {
    next(err);
  }
};

// Dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalActiveUsers = await User.countDocuments({ isDeleted: false });
    const totalHoldings = await CustomerHolding.countDocuments({
      isDeleted: false,
    });

    // pending KYC
    const pendingKyc = await User.countDocuments({ "kyc.status": "pending" });

    res.json({
      totalUsers: totalUsers || 0,
      totalActiveUsers: totalActiveUsers || 0,
      totalHoldings: totalHoldings || 0,
      totalGoldSold: 0, // todo: use transaction data
      totalGoldBought: 0,
      totalTransactions: 0,
      pendingKyc: pendingKyc || 0,
      activeUsers: totalActiveUsers || 0,
    });
  } catch (err) {
    next(err);
  }
};

// Audit logs
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

// ✅ Verify user KYC
export const verifyUserKyc = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.kyc?.status === "verified") {
      return res.status(400).json({ message: "KYC is already verified" });
    }

    user.kyc.verified = true;
    user.kyc.verifiedAt = new Date();
    user.kyc.status = "verified";

    await user.save();

    await notifyUser(
      userId,
      `Your KYC has been verified successfully. You can now buy and redeem gold.`
    );

    await logAudit({
      action: "verify_kyc",
      performedBy: req.user._id,
      targetModel: "User",
      targetId: user._id,
      changes: {
        kyc: { verified: true, verifiedAt: new Date(), status: "verified" },
      },
    });

    res.status(200).json({ message: "KYC verified and user notified." });
  } catch (err) {
    next(err);
  }
};

// ❌ Reject user KYC
export const rejectUserKyc = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.kyc.verified = false;
    user.kyc.status = "rejected";

    await user.save();

    await notifyUser(
      userId,
      `Your KYC has been rejected. Please resubmit your documents.`
    );

    await logAudit({
      action: "reject_kyc",
      performedBy: req.user._id,
      targetModel: "User",
      targetId: user._id,
      changes: { kyc: { verified: false, status: "rejected" } },
    });

    res.status(200).json({ message: "KYC rejected and user notified." });
  } catch (err) {
    next(err);
  }
};

// List of KYC applications
export const getKycApplications = async (req, res, next) => {
  try {
    const users = await User.find({
      "kyc.status": { $in: ["pending", "verified", "rejected"] },
    }).select("name email phone kyc createdAt");

    const applications = users.map((user) => ({
      _id: user._id,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone ? user.phone : "",
      },
      status: user.kyc.status,
      pan: user.kyc.pan,
      aadhar: user.kyc.aadhar,
      panImageUrl: user.kyc.panImageUrl,
      aadharImageUrl: user.kyc.aadharImageUrl,
      submittedAt: user.kyc?.verificationDate || user.createdAt,
    }));

    res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
};

// Verify admin passcode (temporary utility)
export const verifyPasscode = async (req, res) => {
  const { passcode } = req.body;

  if (!passcode)
    return res.status(400).json({ valid: false, message: "Passcode required" });

  const adminUser = await User.findOne({
    role: "admin",
    passcodeHash: { $exists: true },
  });

  if (!adminUser || !adminUser.passcodeHash)
    return res
      .status(500)
      .json({ valid: false, message: "Admin passcode not set" });

  const isValid = await bcrypt.compare(passcode, adminUser.passcodeHash);

  if (isValid) {
    return res.json({ valid: true });
  } else {
    return res.status(401).json({ valid: false, message: "Incorrect passcode" });
  }
};
