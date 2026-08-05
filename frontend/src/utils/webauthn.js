import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from '../lib/axios';

const bufferToBase64URLString = (buffer) => {
  if (!buffer && buffer !== 0) return null;
  const bytes = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : buffer instanceof Uint8Array
    ? buffer
    : buffer && ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : null;
  if (!bytes) return null;
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Ensure an input (string or ArrayBuffer/TypedArray) becomes a base64url string.
const normalizeBase64Url = (input) => {
  if (input === null || input === undefined) return null;

  // If already an ArrayBuffer or TypedArray, convert directly
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    return bufferToBase64URLString(input);
  }

  // If it's a string, try to detect form and normalize
  if (typeof input === 'string') {
    let s = input;

    // Remove any data: prefix
    const commaIdx = s.indexOf(',');
    if (commaIdx !== -1) s = s.slice(commaIdx + 1);

    // If contains base64 characters '+' or '/' or '=' it's standard base64 — convert to base64url
    if (/[+/=]/.test(s)) {
      return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // If it already looks like base64url (alphanumeric, - or _), accept it
    if (/^[A-Za-z0-9_-]+$/.test(s)) return s;

    // As a fallback, treat string as binary and encode
    try {
      const bytes = new Uint8Array(Array.from(s).map((ch) => ch.charCodeAt(0)));
      return bufferToBase64URLString(bytes);
    } catch (e) {
      return s;
    }
  }

  return null;
};

/**
 * Check if WebAuthn is supported in the browser
 */
export const isWebAuthnSupported = () => {
  return !!(navigator.credentials && navigator.credentials.create);
};

/**
 * Check if user has WebAuthn enabled
 */
export const checkWebAuthnStatus = async (email) => {
  try {
    const response = await api.get('/api/webauthn/status', { params: { email } });
    return response.data;
  } catch (error) {
    console.error('Error checking WebAuthn status:', error);
    return { webauthnEnabled: false, requiresPassword: true };
  }
};

/**
 * Register WebAuthn credential (for admin users)
 */
export const registerWebAuthn = async () => {
  try {
    // Generate registration options
    const optionsResponse = await api.post('/api/webauthn/register/generate');
    const options = optionsResponse.data;

    // Start registration
    const credential = await startRegistration(options);

    const payload = {
      id: normalizeBase64Url(credential.rawId) || normalizeBase64Url(credential.id),
      rawId: normalizeBase64Url(credential.rawId) || normalizeBase64Url(credential.id),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment,
      response: {
        clientDataJSON: normalizeBase64Url(credential.response.clientDataJSON),
        attestationObject: normalizeBase64Url(credential.response.attestationObject),
        transports: credential.response?.getTransports?.() || []
      },
      clientExtensionResults: (typeof credential.getClientExtensionResults === 'function'
        ? credential.getClientExtensionResults()
        : credential.clientExtensionResults || {})
    };

    // Verify registration
    const verifyResponse = await api.post('/api/webauthn/register/verify', payload);
    
    return {
      success: verifyResponse.data.verified,
      message: verifyResponse.data.message || 'WebAuthn credential registered successfully'
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'WebAuthn registration failed';
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Authenticate with WebAuthn
 */
export const authenticateWebAuthn = async (email) => {
  try {
    // Generate authentication options
    const optionsResponse = await api.post('/api/webauthn/authenticate/generate', { email });
    const options = optionsResponse.data;

    // Start authentication
    console.debug('WebAuthn - authentication options (from server):', options);
    const authenticationResponse = await startAuthentication(options);
    console.debug('WebAuthn - authentication response (from authenticator):', authenticationResponse);

    const payload = {
      id: normalizeBase64Url(authenticationResponse.rawId) || normalizeBase64Url(authenticationResponse.id),
      rawId: normalizeBase64Url(authenticationResponse.rawId) || normalizeBase64Url(authenticationResponse.id),
      type: authenticationResponse.type,
      authenticatorAttachment: authenticationResponse.authenticatorAttachment,
      response: {
        clientDataJSON: normalizeBase64Url(authenticationResponse.response.clientDataJSON),
        authenticatorData: normalizeBase64Url(authenticationResponse.response.authenticatorData),
        signature: normalizeBase64Url(authenticationResponse.response.signature),
        userHandle: authenticationResponse.response.userHandle
          ? normalizeBase64Url(authenticationResponse.response.userHandle)
          : null
      },
      clientExtensionResults: (typeof authenticationResponse.getClientExtensionResults === 'function'
        ? authenticationResponse.getClientExtensionResults()
        : authenticationResponse.clientExtensionResults || {})
    };

    const payloadToSend = {
      email,
      body: payload
    };

    console.debug('WebAuthn - payload to verify (sent to server):', payloadToSend);

    // Verify authentication
    const verifyResponse = await api.post('/api/webauthn/authenticate/verify', {
      email,
      body: payload
    });

    if (verifyResponse.data.verified) {
      return {
        success: true,
        token: verifyResponse.data.token,
        user: verifyResponse.data.user
      };
    }

    return {
      success: false,
      error: 'Authentication verification failed'
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'WebAuthn authentication failed';
    
    // Check if it's because WebAuthn is not registered
    if (error.response?.status === 400 && error.response?.data?.requiresPassword) {
      return {
        success: false,
        requiresPassword: true,
        error: 'WebAuthn not registered. Please use password login or register WebAuthn first.'
      };
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};
