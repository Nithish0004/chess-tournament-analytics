import crypto from 'crypto';

let lastGeneratedToken = null;

/**
 * Generates a random 32-byte hexadecimal token.
 * Stores the last generated token in memory so tests can capture it.
 */
export const generateToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  lastGeneratedToken = token;
  return token;
};

/**
 * Computes the SHA-256 hash of a raw token.
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Returns the last generated token (used for capturing links in test mode).
 */
export const getLastGeneratedToken = () => lastGeneratedToken;

/**
 * Resets the last generated token.
 */
export const clearLastGeneratedToken = () => {
  lastGeneratedToken = null;
};

/**
 * Creates and persists an auth token record in the database.
 * Stores ONLY the SHA-256 hash.
 * Returns the unhashed token (to be sent via email or logged) and expiry.
 */
export const createAuthToken = async (connectionOrPool, { userId, purpose, expiresInHours = 24 }) => {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await connectionOrPool.query(
    `INSERT INTO auth_token (user_id, token_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, tokenHash, purpose, expiresAt]
  );

  return { token, tokenHash, expiresAt };
};

export default {
  generateToken,
  hashToken,
  getLastGeneratedToken,
  clearLastGeneratedToken,
  createAuthToken
};
