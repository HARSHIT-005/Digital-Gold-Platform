import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.mjs';
import CustomerHolding from '../models/CustomerHolding.mjs';
import dotenv from 'dotenv';
dotenv.config();

const createAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const createRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES_IN });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Check for existing user by email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'User with this email already exists' });

    // Check for existing user by phone (only if phone is provided)
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, passwordHash });
    
    // Create customer holding
    const existingHolding = await CustomerHolding.findOne({ customerId: user._id });
    if (!existingHolding) {
      await CustomerHolding.create({
        customerId: user._id,
        totalGrams: 0,
        averagePricePerGram: 0,
        totalInvested: 0,
        isDeleted: false
      });
    }

    const token = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }).json({ 
      token,
      user: { 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone 
      } 
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.isDeleted) return res.status(401).json({ message: 'Invalid credentials' });

    // Validate password
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Password not set for this account' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.lastLogin = new Date();
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }).json({ token, user: { name: user.name, role: user.role } });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out' });
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.isDeleted) return res.status(401).json({ message: 'User not found or deleted' });

    const newAccessToken = createAccessToken(user);
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user.kyc) {
      user.kyc = { status: 'not_submitted' };
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
