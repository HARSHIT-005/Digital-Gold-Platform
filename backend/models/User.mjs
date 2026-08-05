import mongoose from 'mongoose';

const kycSchema = new mongoose.Schema({
  pan: String,
  aadhar: String,
  panImageUrl: String,
  aadharImageUrl: String,
  verified: { type: Boolean, default: false },
  verificationDate: Date,
  status: { 
    type: String, 
    enum: ['not_submitted', 'pending', 'verified', 'rejected'], 
    default: 'not_submitted' 
  }
});

const webauthnCredentialSchema = new mongoose.Schema({
  credentialID: { type: String, required: true },
  credentialPublicKey: { type: String, required: true },
  counter: { type: Number, default: 0 },
  deviceType: String,
  registeredAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, unique: true, sparse: true },
  role: { type: String, default: 'customer' },
  passwordHash: String,
  passcodeHash: String,
  isDeleted: { type: Boolean, default: false },
  kyc: kycSchema,
  webauthnCredentials: [webauthnCredentialSchema],
  webauthnEnabled: { type: Boolean, default: false },
  webauthnChallenge: String, // Temporary storage for registration/auth challenges
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const User = mongoose.model("User" , userSchema);  // note: double quotes + extra space
export default User;
