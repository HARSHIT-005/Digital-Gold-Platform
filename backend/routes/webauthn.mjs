import express from 'express';
import { 
  generateRegistrationOptionsHandler, 
  verifyRegistrationHandler,
  generateAuthenticationOptionsHandler,
  verifyAuthenticationHandler,
  checkWebAuthnStatus
} from '../controllers/webauthnController.mjs';
import { protect } from '../middlewares/auth.mjs';

const router = express.Router();

// Check WebAuthn status (public, for checking before login)
router.get('/status', checkWebAuthnStatus);

// Registration endpoints (protected - admin only)
router.post('/register/generate', protect, generateRegistrationOptionsHandler);
router.post('/register/verify', protect, verifyRegistrationHandler);

// Authentication endpoints (public - for login)
router.post('/authenticate/generate', generateAuthenticationOptionsHandler);
router.post('/authenticate/verify', verifyAuthenticationHandler);

export default router;

