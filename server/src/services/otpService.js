import crypto from 'crypto';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Generate a 6-digit zero-padded OTP code using cryptographically secure randomInt.
 * Never uses Math.random.
 */
export const generateCode = () => {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
};

/**
 * Compute HMAC-SHA256 hex digest using OTP_PEPPER over `${userId}:${purpose}:${code}`.
 */
export const hashCode = (userId, purpose, code) => {
  return crypto
    .createHmac('sha256', env.OTP_PEPPER)
    .update(`${userId}:${purpose}:${code}`)
    .digest('hex');
};

/**
 * Issues a new OTP for the given user and purpose:
 * - Enforces 60-second cooldown since the previous code
 * - Enforces at most 5 codes per hour per user and purpose
 * - Deletes or invalidates older unused codes of that user and purpose
 * - Inserts a new row with expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
 * - Returns the plain code ONLY to the caller that sends the email
 * - Never stores or logs the plain code
 */
export const issueOtp = async (userId, purpose, conn = pool) => {
  // 1. Enforce 60s cooldown since last code
  const [recent] = await conn.query(
    `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_seconds
     FROM email_otp
     WHERE user_id = ? AND purpose = ?
     ORDER BY created_at DESC, otp_id DESC
     LIMIT 1`,
    [userId, purpose]
  );

  if (recent.length > 0 && recent[0].elapsed_seconds !== null && recent[0].elapsed_seconds < 60) {
    const retryAfter = Math.max(1, 60 - recent[0].elapsed_seconds);
    const err = new Error(`Please wait ${retryAfter} seconds before requesting another code`);
    err.status = 429;
    err.statusCode = 429;
    err.code = 'COOLDOWN_ACTIVE';
    err.retry_after = retryAfter;
    throw err;
  }

  // 2. Enforce at most 5 codes per hour per user and purpose
  const [hourly] = await conn.query(
    `SELECT COUNT(*) AS count
     FROM email_otp
     WHERE user_id = ? AND purpose = ?
       AND created_at >= NOW() - INTERVAL 1 HOUR`,
    [userId, purpose]
  );

  if (hourly[0].count >= 5) {
    const [oldest] = await conn.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(created_at, INTERVAL 1 HOUR)) AS retry_after
       FROM email_otp
       WHERE user_id = ? AND purpose = ?
         AND created_at >= NOW() - INTERVAL 1 HOUR
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId, purpose]
    );
    const retryAfter = Math.max(1, oldest[0]?.retry_after || 3600);
    const err = new Error('Too many OTP requests. Please try again later');
    err.status = 429;
    err.statusCode = 429;
    err.code = 'HOURLY_LIMIT_EXCEEDED';
    err.retry_after = retryAfter;
    throw err;
  }

  // 3. Delete or invalidate older unused codes of that user and purpose
  await conn.query(
    `DELETE FROM email_otp WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
    [userId, purpose]
  );

  // 4. Generate plain code & keyed HMAC-SHA256 hash
  const code = generateCode();
  const codeHash = hashCode(userId, purpose, code);

  // 5. Store hash with 10-minute validity
  await conn.query(
    `INSERT INTO email_otp (user_id, purpose, code_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [userId, purpose, codeHash]
  );

  return {
    code,
    expires_in: 600,
    resend_after: 60
  };
};

/**
 * Verifies an OTP code:
 * - Loads the newest unused, unexpired code (comparing expires_at to NOW() in SQL)
 * - Atomically increments attempts before comparing
 * - Compares HMAC hashes with crypto.timingSafeEqual
 * - On success sets used_at = NOW()
 * - Returns { ok: true } on success
 * - Returns { ok: false, reason: 'INVALID'|'EXPIRED'|'LOCKED', attempts_left } otherwise
 * - Handles database trigger errors (1644) gracefully
 */
export const verifyOtp = async (userId, purpose, code, conn = pool) => {
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return { ok: false, reason: 'INVALID', attempts_left: 0 };
  }

  const cleanCode = code.trim();

  // 1. Query newest unused, unexpired code
  const [rows] = await conn.query(
    `SELECT otp_id, code_hash, attempts, max_attempts
     FROM email_otp
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC, otp_id DESC
     LIMIT 1`,
    [userId, purpose]
  );

  if (rows.length === 0) {
    // Determine the reason for failure (expired, locked, or not found)
    const [anyRow] = await conn.query(
      `SELECT otp_id, used_at, attempts, max_attempts,
              CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END AS is_expired
       FROM email_otp
       WHERE user_id = ? AND purpose = ?
       ORDER BY created_at DESC, otp_id DESC
       LIMIT 1`,
      [userId, purpose]
    );

    if (anyRow.length === 0) {
      return { ok: false, reason: 'INVALID', attempts_left: 0 };
    }

    const last = anyRow[0];
    if (last.attempts >= last.max_attempts) {
      return { ok: false, reason: 'LOCKED', attempts_left: 0 };
    }
    if (last.is_expired) {
      return { ok: false, reason: 'EXPIRED', attempts_left: 0 };
    }
    return { ok: false, reason: 'INVALID', attempts_left: 0 };
  }

  const target = rows[0];

  // 2. Increment attempts atomically BEFORE comparing
  let updateRes;
  try {
    const [res] = await conn.query(
      `UPDATE email_otp
       SET attempts = attempts + 1
       WHERE otp_id = ? AND attempts < max_attempts`,
      [target.otp_id]
    );
    updateRes = res;
  } catch (err) {
    if (err.errno === 1644 || err.sqlState === '45000') {
      const msg = err.message || '';
      if (msg.includes('already used')) {
        return { ok: false, reason: 'INVALID', attempts_left: 0 };
      }
      return { ok: false, reason: 'LOCKED', attempts_left: 0 };
    }
    throw err;
  }

  if (updateRes.affectedRows === 0) {
    return { ok: false, reason: 'LOCKED', attempts_left: 0 };
  }

  const newAttempts = target.attempts + 1;
  const candidateHash = hashCode(userId, purpose, cleanCode);

  const candBuf = Buffer.from(candidateHash, 'hex');
  const storeBuf = Buffer.from(target.code_hash, 'hex');

  const isMatch = candBuf.length === storeBuf.length && crypto.timingSafeEqual(candBuf, storeBuf);

  if (isMatch) {
    try {
      await conn.query(
        `UPDATE email_otp SET used_at = NOW() WHERE otp_id = ?`,
        [target.otp_id]
      );
      return { ok: true };
    } catch (err) {
      if (err.errno === 1644 || err.sqlState === '45000') {
        return { ok: false, reason: 'INVALID', attempts_left: 0 };
      }
      throw err;
    }
  }

  const attemptsLeft = Math.max(0, target.max_attempts - newAttempts);
  if (attemptsLeft === 0) {
    return { ok: false, reason: 'LOCKED', attempts_left: 0 };
  }

  return {
    ok: false,
    reason: 'INVALID',
    attempts_left: attemptsLeft
  };
};

export default {
  generateCode,
  hashCode,
  issueOtp,
  verifyOtp
};
