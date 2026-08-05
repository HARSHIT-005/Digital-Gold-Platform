import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import User from "../models/User.mjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const rpName = "Digital Gold Platform";
const rpID = process.env.WEBAUTHN_RP_ID;
const origin = process.env.WEBAUTHN_ORIGIN;

const createAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const bufferToBase64URLString = (value) => {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("base64url");
  if (value instanceof ArrayBuffer) return Buffer.from(value).toString("base64url");
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("base64url");
  }
  return value;
};

const serializeRegistrationOptions = (options) => {
  if (!options) return options;
  return {
    ...options,
    challenge: bufferToBase64URLString(options.challenge),
    user: {
      ...options.user,
      id: bufferToBase64URLString(options.user?.id),
    },
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((cred) => ({
          ...cred,
          id: bufferToBase64URLString(cred.id),
        }))
      : [],
  };
};

const serializeAuthenticationOptions = (options) => {
  if (!options) return options;
  return {
    ...options,
    challenge: bufferToBase64URLString(options.challenge),
    allowCredentials: Array.isArray(options.allowCredentials)
      ? options.allowCredentials.map((cred) => ({
          ...cred,
          id: bufferToBase64URLString(cred.id),
        }))
      : [],
  };
};

// Generate registration options for WebAuthn
export const generateRegistrationOptionsHandler = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'WebAuthn is only available for admin users' });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.name,
      userID: Buffer.from(userId.toString()),
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: user.webauthnCredentials?.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: ['usb', 'nfc', 'ble', 'internal']
      })) || [],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        requireResidentKey: false
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store challenge in user session or temporary storage
    // For simplicity, we'll store it in a temporary field (in production, use Redis or session)
    user.webauthnChallenge = options.challenge;
    await user.save();

    res.json(serializeRegistrationOptions(options));
  } catch (err) {
    next(err);
  }
};

// Verify registration response
export const verifyRegistrationHandler = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'WebAuthn is only available for admin users' });
    }

    const { body } = req;
    const expectedChallenge = user.webauthnChallenge;

    if (!expectedChallenge) {
      return res.status(400).json({ message: 'No registration challenge found' });
    }

    let verification;
    try {
      const expectedOriginLocal = origin || req.get('origin') || `http://localhost:3000`;
      let expectedRPIDLocal = rpID;
      if (!expectedRPIDLocal) {
        try {
          const url = new URL(expectedOriginLocal);
          expectedRPIDLocal = url.hostname;
        } catch (e) {
          expectedRPIDLocal = 'localhost';
        }
      }

      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: expectedOriginLocal,
        expectedRPID: expectedRPIDLocal,
        requireUserVerification: true
      });

    } catch (error) {
      console.error('verifyRegistrationResponse error:', error);
      if (error && error.stack) console.error(error.stack);
      return res.status(400).json({ message: `Verification failed: ${error.message}` });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      // Helper to convert many possible shapes into a Buffer (returns null if not possible)
      const toBuffer = (v) => {
        try {
          if (!v && v !== 0) return null;
          if (Buffer.isBuffer(v)) return Buffer.from(v);
          if (v instanceof ArrayBuffer) return Buffer.from(v);
          if (ArrayBuffer.isView(v)) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
          if (typeof v === 'string') {
            // Try base64url, then base64, then utf8
            try { return Buffer.from(v, 'base64url'); } catch (e) {}
            try { return Buffer.from(v, 'base64'); } catch (e) {}
            try { return Buffer.from(v, 'utf8'); } catch (e) {}
          }
          return null;
        } catch (e) {
          return null;
        }
      };

      // Attempt to build credentialID buffer from registrationInfo or request body
      let credentialIDBuf = toBuffer(registrationInfo.credentialID);
      if (!credentialIDBuf) {
        credentialIDBuf = toBuffer(registrationInfo.credential?.id || registrationInfo.credential?.credentialID);
      }
      if (!credentialIDBuf && body?.rawId) {
        credentialIDBuf = toBuffer(body.rawId);
      }
      if (!credentialIDBuf && body?.id) {
        credentialIDBuf = toBuffer(body.id);
      }

      if (!credentialIDBuf) {
        console.error('No credential ID found in registrationInfo or request body');
        return res.status(400).json({ message: 'No credential ID found in registration response' });
      }

      // Attempt to build credentialPublicKey buffer from multiple possible locations
      let credentialPublicKeyBuf = toBuffer(registrationInfo.credentialPublicKey);
      if (!credentialPublicKeyBuf && registrationInfo.credentialPublicKeyBytes) {
        credentialPublicKeyBuf = toBuffer(registrationInfo.credentialPublicKeyBytes);
      }

      // Some verifier versions put the key inside registrationInfo.credential (object) in various shapes
      if (!credentialPublicKeyBuf && registrationInfo.credential) {
        const cred = registrationInfo.credential;
        // Common property names that might contain the COSE public key
        const candidateKeys = ['publicKey', 'credentialPublicKey', 'publicKeyBytes', 'rawPublicKey', 'public_key', 'publicKeyCOSE'];
        for (const k of candidateKeys) {
          if (cred[k]) {
            credentialPublicKeyBuf = toBuffer(cred[k]);
            if (credentialPublicKeyBuf) break;
          }
        }
        // Fallback: scan all properties for a binary-like value
        if (!credentialPublicKeyBuf) {
          for (const [k, v] of Object.entries(cred)) {
            credentialPublicKeyBuf = toBuffer(v);
            if (credentialPublicKeyBuf) break;
          }
        }
      }

      // Final fallback: the attestationObject may contain the public key (decoding would be required)
      if (!credentialPublicKeyBuf && body?.response?.attestationObject) {
        // We won't parse CBOR here (complex); log for diagnosis so we can add a parser if needed
        console.error('Attestation object present but public key not extracted automatically. Attestation object length:',
          (typeof body.response.attestationObject === 'string') ? Buffer.from(body.response.attestationObject, 'base64').length : null);
      }

      if (!credentialPublicKeyBuf) {
        console.error('No credential public key found in registration info');
        try {
          console.error('registrationInfo keys:', Object.keys(registrationInfo));
          if (registrationInfo.credential) console.error('registrationInfo.credential keys:', Object.keys(registrationInfo.credential));
          console.error('body keys:', Object.keys(body || {}));
          console.error('body.response keys:', body?.response ? Object.keys(body.response) : []);
        } catch (logErr) {
          console.error('Error while logging registration debug info:', logErr);
        }
        return res.status(400).json({ message: 'No credential public key found in registration info' });
      }

      const credentialID = credentialIDBuf.toString('base64url');
      const newCredential = {
        credentialID: credentialID,
        credentialPublicKey: credentialPublicKeyBuf.toString('base64'),
        counter: registrationInfo.counter || 0,
        deviceType: body.response?.authenticatorAttachment || 'unknown',
        registeredAt: new Date()
      };

      if (!user.webauthnCredentials) user.webauthnCredentials = [];
      user.webauthnCredentials.push(newCredential);
      user.webauthnEnabled = true;
      user.webauthnChallenge = undefined;
      await user.save();

      return res.json({ 
        verified: true, 
        message: 'WebAuthn credential registered successfully',
        credentialID: newCredential.credentialID
      });
    }

    res.status(400).json({ message: 'Registration verification failed' });
  } catch (err) {
    next(err);
  }
};

// Generate authentication options
export const generateAuthenticationOptionsHandler = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'WebAuthn is only available for admin users' });
    }

    if (!user.webauthnEnabled || !user.webauthnCredentials || user.webauthnCredentials.length === 0) {
      return res.status(400).json({ 
        message: 'WebAuthn not registered for this user',
        requiresPassword: true 
      });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.webauthnCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: ['usb', 'nfc', 'ble', 'internal']
      })),
      userVerification: 'preferred',
      timeout: 60000
    });

    // Store challenge temporarily
    user.webauthnChallenge = options.challenge;
    await user.save();

    res.json(serializeAuthenticationOptions(options));
  } catch (err) {
    next(err);
  }
};

// Verify authentication response
export const verifyAuthenticationHandler = async (req, res, next) => {
  try {
    const { email, body: authenticationResponse } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'WebAuthn is only available for admin users' });
    }

    if (!user.webauthnEnabled || !user.webauthnCredentials || user.webauthnCredentials.length === 0) {
      return res.status(400).json({ message: 'WebAuthn not registered for this user' });
    }

    const expectedChallenge = user.webauthnChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ message: 'No authentication challenge found' });
    }

    // DEBUG: log incoming authentication response and stored credentials
    try {
      console.log('--- WebAuthn Verify Request ---');
      console.log('Email:', email);
      console.log('Expected Challenge (stored):', expectedChallenge);
      console.log('Stored credentials (IDs):', (user.webauthnCredentials || []).map(c => c.credentialID));

      if (!authenticationResponse) {
        console.log('authenticationResponse is undefined or null');
      } else {
        console.log('authenticationResponse keys:', Object.keys(authenticationResponse));
        console.log('authenticationResponse.id (type):', typeof authenticationResponse.id, 'value:', authenticationResponse.id);
        console.log('authenticationResponse.rawId (typeof):', Object.prototype.toString.call(authenticationResponse.rawId));
        // If rawId is a string, print a short sample
        if (typeof authenticationResponse.rawId === 'string') {
          console.log('authenticationResponse.rawId (string sample):', authenticationResponse.rawId.slice(0, 80));
        }
      }
      console.log('--- End WebAuthn Verify Request ---');
    } catch (logErr) {
      console.error('Error logging WebAuthn request for debug:', logErr);
    }

    // Find the credential being used
    // The ID from the response is already base64url encoded
    const credentialIDFromResponse = authenticationResponse.id;
    const credential = user.webauthnCredentials.find(
      cred => {
        // Compare base64url strings directly
        try {
          const credBuffer = Buffer.from(cred.credentialID, 'base64url');
          const respBuffer = Buffer.from(credentialIDFromResponse, 'base64url');
          return credBuffer.equals(respBuffer);
        } catch {
          return cred.credentialID === credentialIDFromResponse;
        }
      }
    );

    if (!credential) {
      return res.status(400).json({ message: 'Credential not found' });
    }

    let verification;
    try {
      const expectedOriginLocal = origin || req.get('origin') || `http://localhost:3000`;
      let expectedRPIDLocal = rpID;
      if (!expectedRPIDLocal) {
        try {
          const url = new URL(expectedOriginLocal);
          expectedRPIDLocal = url.hostname;
        } catch (e) {
          expectedRPIDLocal = 'localhost';
        }
      }

      // DEBUG: show inputs to verifier
      try {
        console.log('Calling verifyAuthenticationResponse with:');
        console.log('  expectedChallenge:', expectedChallenge);
        console.log('  expectedOrigin:', expectedOriginLocal);
        console.log('  expectedRPID:', expectedRPIDLocal);
        console.log('  authenticator credentialID (base64url):', credential.credentialID);
        console.log('  authenticator credentialPublicKey (sample):', credential.credentialPublicKey?.slice(0, 60));
        console.log('  authenticator stored counter:', credential.counter);
        console.log('  authenticationResponse keys:', Object.keys(authenticationResponse || {}));
        console.log('  authenticationResponse.response keys:', authenticationResponse?.response ? Object.keys(authenticationResponse.response) : 'no response');
      } catch (logErr) {
        console.error('Error logging verifier inputs:', logErr);
      }

      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge,
        expectedOrigin: expectedOriginLocal,
        expectedRPID: expectedRPIDLocal,
        credential: {
          id: Buffer.from(credential.credentialID, 'base64url'),
          publicKey: Buffer.from(credential.credentialPublicKey, 'base64'),
          counter: typeof credential.counter === 'number' ? credential.counter : 0
        },
        requireUserVerification: true
      });
    } catch (error) {
      console.error('verifyAuthenticationResponse error:', error);
      if (error && error.stack) console.error(error.stack);
      return res.status(400).json({ message: `Authentication verification failed: ${error.message}` });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update counter
      credential.counter = authenticationInfo.newCounter;
      user.webauthnChallenge = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = createAccessToken(user);

      return res.json({
        verified: true,
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    res.status(400).json({ message: 'Authentication verification failed' });
  } catch (err) {
    next(err);
  }
};

// Check if user has WebAuthn enabled
export const checkWebAuthnStatus = async (req, res, next) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('webauthnEnabled role');
    
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.json({ webauthnEnabled: false, requiresPassword: true });
    }

    res.json({ 
      webauthnEnabled: user.webauthnEnabled || false,
      requiresPassword: !user.webauthnEnabled
    });
  } catch (err) {
    next(err);
  }
};

