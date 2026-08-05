import express from 'express';
import { 
  addToCart, 
  getMyCart, 
  checkoutCart, 
  cancelCart 
} from '../controllers/cartController.mjs';
import { protect } from '../middlewares/auth.mjs';
import { checkKycVerified } from '../middlewares/checkKycVerified.mjs';

const router = express.Router();

// All cart routes require authentication and KYC verification
router.post('/add', protect, checkKycVerified, addToCart);
router.get('/me', protect, checkKycVerified, getMyCart);
router.post('/checkout', protect, checkKycVerified, checkoutCart);
router.post('/cancel', protect, checkKycVerified, cancelCart);

export default router;

