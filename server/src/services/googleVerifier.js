import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

let verifierStub = null;

/**
 * Configure a stub implementation for verifyGoogleIdToken (used exclusively in tests).
 * Avoids any environment variable bypass in production code.
 */
export const setGoogleVerifierStub = (stub) => {
  verifierStub = stub;
};

/**
 * Reset the stub implementation back to the production OAuth2Client verifier.
 */
export const resetGoogleVerifierStub = () => {
  verifierStub = null;
};

/**
 * Verifies a Google ID token using google-auth-library OAuth2Client.
 * Audience is set to GOOGLE_CLIENT_ID.
 *
 * @param {string} idToken - Raw Google ID token
 * @returns {Promise<{sub: string, email: string, email_verified: boolean, name: string}>}
 * @throws {Error} with status 503 / code GOOGLE_DISABLED if GOOGLE_CLIENT_ID is unset
 * @throws {Error} with status 401 / code INVALID_GOOGLE_TOKEN if verification fails or email_verified is not true
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (typeof verifierStub === 'function') {
    const stubResult = await verifierStub(idToken);
    if (!stubResult || stubResult.email_verified !== true) {
      const error = new Error('INVALID_GOOGLE_TOKEN');
      error.status = 401;
      error.code = 'INVALID_GOOGLE_TOKEN';
      throw error;
    }
    return {
      sub: String(stubResult.sub),
      email: String(stubResult.email || '').toLowerCase().trim(),
      email_verified: true,
      name: stubResult.name || (stubResult.email ? stubResult.email.split('@')[0] : '')
    };
  }

  const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !clientId.trim()) {
    const error = new Error('GOOGLE_DISABLED');
    error.status = 503;
    error.code = 'GOOGLE_DISABLED';
    throw error;
  }

  const client = new OAuth2Client(clientId);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: clientId
    });
  } catch (err) {
    const error = new Error('INVALID_GOOGLE_TOKEN');
    error.status = 401;
    error.code = 'INVALID_GOOGLE_TOKEN';
    throw error;
  }

  const payload = ticket.getPayload();
  if (!payload || payload.email_verified !== true) {
    const error = new Error('INVALID_GOOGLE_TOKEN');
    error.status = 401;
    error.code = 'INVALID_GOOGLE_TOKEN';
    throw error;
  }

  return {
    sub: payload.sub,
    email: String(payload.email || '').toLowerCase().trim(),
    email_verified: true,
    name: payload.name || payload.given_name || (payload.email ? payload.email.split('@')[0] : '')
  };
};

/**
 * Route-level middleware to enforce Google OAuth availability.
 * Answers 503 GOOGLE_DISABLED if GOOGLE_CLIENT_ID is not configured.
 */
export const ensureGoogleEnabled = (req, res, next) => {
  const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !clientId.trim()) {
    return res.status(503).json({
      error: 'GOOGLE_DISABLED',
      code: 'GOOGLE_DISABLED',
      message: 'Google authentication is currently disabled'
    });
  }
  next();
};

export default {
  verifyGoogleIdToken,
  setGoogleVerifierStub,
  resetGoogleVerifierStub,
  ensureGoogleEnabled
};
