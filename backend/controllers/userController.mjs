// 🪪 KYC & Profile Controller (minor formatting tweaks - logic unchanged)
import User from "../models/User.mjs";
import cloudinary from "../config/cloudinary.mjs";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// ✅ Submit KYC info
export const submitKyc = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pan, aadhar, panImageUrl, aadharImageUrl } = req.body;

    if (!pan || !aadhar || !panImageUrl || !aadharImageUrl) {
      return res.status(400).json({ message: "All KYC fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.kyc) user.kyc = {};

    user.kyc.pan = pan;
    user.kyc.aadhar = aadhar;
    user.kyc.panImageUrl = panImageUrl;
    user.kyc.aadharImageUrl = aadharImageUrl;
    user.kyc.verified = false;
    user.kyc.verificationDate = null;
    user.kyc.status = "pending";

    await user.save();

    return res
      .status(200)
      .json({ message: "KYC submitted successfully. Awaiting verification." });
  } catch (err) {
    console.error("KYC submission error:", err);
    next(err);
  }
};

// 📸 Upload KYC images
export const uploadKycImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kyc",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return next(error);
        res.json({ url: result.secure_url });
      }
    );

    stream.end(req.file.buffer);
  } catch (err) {
    next(err);
  }
};

// 👤 Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ message: "Name, email, and phone are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🧩 Check for existing email
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email is already registered with another account" });
    }

    // 🧩 Check for existing phone
    const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
    if (existingPhone) {
      return res.status(400).json({
        message: "Phone number is already registered with another account",
      });
    }

    // 📝 Update user fields
    user.name = name;
    user.email = email;
    user.phone = phone;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycVerified: user.kyc.verified,
      },
    });
  } catch (err) {
    next(err);
  }
};
