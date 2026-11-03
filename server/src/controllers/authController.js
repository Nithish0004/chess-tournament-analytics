import bcrypt from 'bcrypt';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { countries } from 'countries-list';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { signToken } from '../utils/jwt.js';
import { hashToken, createAuthToken } from '../utils/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendAccountApprovedEmail } from '../services/mailService.js';
import { getPermissions } from '../middleware/authMiddleware.js';

const BCRYPT_ROUNDS = 12;
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// Country code resolver helper
const resolveCountryData = (codeOrName) => {
  if (!codeOrName || typeof codeOrName !== 'string') return { code: null, name: null };
  const raw = codeOrName.trim();
  const upper = raw.toUpperCase();

  // If 2-letter ISO code exists in countries-list
  if (upper.length === 2 && countries[upper]) {
    return { code: upper, name: countries[upper].name };
  }

  // Lookup by country name (case-insensitive)
  const lower = raw.toLowerCase();
  for (const [code, data] of Object.entries(countries)) {
    if (data.name.toLowerCase() === lower || (data.native && data.native.toLowerCase() === lower)) {
      return { code, name: data.name };
    }
  }

  // Common Aliases
  if (lower === 'usa' || lower === 'united states' || lower === 'united states of america') {
    return { code: 'US', name: 'United States' };
  }
  if (lower === 'uk' || lower === 'united kingdom' || lower === 'england') {
    return { code: 'GB', name: 'United Kingdom' };
  }
  if (lower === 'russia') {
    return { code: 'RU', name: 'Russia' };
  }
  if (lower === 'south korea') {
    return { code: 'KR', name: 'South Korea' };
  }

  if (/^[A-Za-z]{2}$/.test(raw)) {
    return { code: raw.toUpperCase(), name: raw.toUpperCase() };
  }

  return { code: null, name: raw };
};

const passwordValidation = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

const dateOfBirthValidation = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format')
  .refine(val => {
    const dob = new Date(val);
    const now = new Date();
    if (isNaN(dob.getTime())) return false;
    if (dob >= now) return false;
    const minAgeDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    return dob <= minAgeDate;
  }, {
    message: 'date_of_birth must be in the past and age must be at least 5 years'
  });

export const registerPlayerObject = z.object({
  role: z.literal('PLAYER'),
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  username: z.string().trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[A-Za-z0-9_]{3,20}$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z.string().trim().email('Invalid email address').max(120),
  password: passwordValidation,
  confirm_password: z.string().min(1, 'Please confirm your password'),
  country_code: z.string().trim().max(10).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  date_of_birth: dateOfBirthValidation,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'], {
    errorMap: () => ({ message: 'Gender must be MALE, FEMALE, OTHER, or UNDISCLOSED' })
  }),
  phone: z.string().trim().max(20).optional().nullable(),
  experience_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], {
    errorMap: () => ({ message: 'Experience level must be BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT' })
  }),
  club: z.string().trim().max(100).optional().nullable(),
  fide_id: z.string().trim().max(12).optional().nullable(),
  accept_terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' })
  })
});

export const registerOrganizerObject = z.object({
  role: z.literal('ORGANIZER'),
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  username: z.string().trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[A-Za-z0-9_]{3,20}$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z.string().trim().email('Invalid email address').max(120),
  password: passwordValidation,
  confirm_password: z.string().min(1, 'Please confirm your password'),
  phone: z.string().trim().min(1, 'Phone is required').max(20),
  organization: z.string().trim().min(1, 'Organization is required').max(120),
  country_code: z.string().trim().max(10).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  accept_terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' })
  })
});

export const registerPlayerSchema = registerPlayerObject.refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

export const registerOrganizerSchema = registerOrganizerObject.refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

export const registerSchema = z.discriminatedUnion('role', [
  registerPlayerObject,
  registerOrganizerObject
]).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address')
});

export const loginSchema = z.object({
  email: z.string().trim().optional(),
  username: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional()
}).refine(data => !!(data.email || data.username || data.identifier), {
  message: 'Email or username is required',
  path: ['email']
});

export const googleAuthSchema = z.object({
  id_token: z.string().min(1, 'id_token is required'),
  role: z.enum(['PLAYER', 'ORGANIZER']).optional().default('PLAYER')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordValidation,
  confirm_password: z.string().min(1, 'Please confirm your password')
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]{3,20}$/).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  organization: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  country_code: z.string().trim().max(10).optional().nullable(),
  date_of_birth: dateOfBirthValidation.optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional().nullable(),
  experience_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional().nullable(),
  club: z.string().trim().max(100).optional().nullable(),
  fide_id: z.string().trim().max(12).optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for profile update'
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one digit')
});

// Controllers

/**
 * Real-time username availability check (debounced on frontend).
 * Case-insensitive, enforces 3-20 characters letters/numbers/underscore.
 */
export const checkUsername = async (req, res, next) => {
  try {
    const raw = req.query.username || req.body?.username || '';
    const username = String(raw).trim();

    if (!username) {
      return res.status(400).json({ available: false, error: 'Username is required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(200).json({
        available: false,
        error: 'Username must be between 3 and 20 characters long'
      });
    }

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      return res.status(200).json({
        available: false,
        error: 'Username may only contain letters, numbers, and underscores'
      });
    }

    const [rows] = await pool.query(
      'SELECT user_id FROM app_user WHERE LOWER(username) = LOWER(?) LIMIT 1',
      [username]
    );

    if (rows.length > 0) {
      return res.status(200).json({
        available: false,
        error: 'This username is already taken. Please choose another.'
      });
    }

    return res.status(200).json({
      available: true,
      message: 'Username is available'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Real-time email availability check (debounced on frontend).
 * Case-insensitive uniqueness enforcement.
 */
export const checkEmail = async (req, res, next) => {
  try {
    const raw = req.query.email || req.body?.email || '';
    const email = String(raw).trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ available: false, error: 'Email address is required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({
        available: false,
        error: 'Invalid email address format'
      });
    }

    const [rows] = await pool.query(
      'SELECT user_id FROM app_user WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (rows.length > 0) {
      return res.status(200).json({
        available: false,
        error: 'An account with this email address already exists'
      });
    }

    return res.status(200).json({
      available: true,
      message: 'Email address is available'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public User Registration
 * Enforces role safety (never allows ADMIN self-assignment), validates uniqueness at application & DB levels.
 */
export const register = async (req, res, next) => {
  const {
    role: requestedRole,
    full_name,
    username: rawUsername,
    email: rawEmail,
    password,
    country,
    country_code: rawCountryCode,
    date_of_birth,
    gender,
    experience_level,
    club,
    fide_id,
    phone,
    organization
  } = req.body;

  // Security Rule: Never allow self-assigning ADMIN privileges
  if (requestedRole === 'ADMIN') {
    return res.status(400).json({ error: 'Cannot register with administrator privileges' });
  }

  // Allow ORGANIZER only when properly submitted with phone & organization
  const role = requestedRole === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';

  const email = (rawEmail || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email address is required', field: 'email' });
  }

  // Username validation & auto-generation fallback for legacy payloads
  let username = (rawUsername || '').trim();
  if (!username) {
    const emailPrefix = email.split('@')[0].replace(/[^A-Za-z0-9_]/g, '').slice(0, 10) || 'player';
    username = `${emailPrefix}_${Date.now().toString().slice(-6)}`.slice(0, 20);
  }

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
      field: 'username'
    });
  }

  // Country resolution (ISO 3166-1 alpha-2 code and display name)
  const resolved = resolveCountryData(rawCountryCode || country || '');
  const countryCode = resolved.code;
  const countryName = resolved.name || country || null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Strict Server-Side Email Uniqueness Check (Case-Insensitive)
    const [existingUsers] = await conn.query(
      'SELECT user_id, email FROM app_user WHERE LOWER(email) = LOWER(?)',
      [email]
    );

    if (existingUsers.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: 'An account with this email address already exists. Please sign in or use a different email.',
        field: 'email',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // 2. Strict Server-Side Username Uniqueness Check (Case-Insensitive)
    const [existingUsernames] = await conn.query(
      'SELECT user_id, username FROM app_user WHERE LOWER(username) = LOWER(?)',
      [username]
    );

    if (existingUsernames.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: 'This username is already taken. Please choose another username.',
        field: 'username',
        code: 'USERNAME_TAKEN'
      });
    }

    // Secure password hashing
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let playerId = null;

    if (role === 'PLAYER') {
      // Check if player row already exists with this email (e.g. unlinked tournament competitor)
      const [existingPlayers] = await conn.query(
        'SELECT player_id FROM player WHERE LOWER(email) = LOWER(?)',
        [email]
      );

      if (existingPlayers.length > 0) {
        const foundPlayerId = existingPlayers[0].player_id;
        const [linkedUsers] = await conn.query(
          'SELECT user_id FROM app_user WHERE player_id = ?',
          [foundPlayerId]
        );
        if (linkedUsers.length === 0) {
          playerId = foundPlayerId;
          await conn.query(
            `UPDATE player
             SET name = ?, country = COALESCE(?, country), country_code = COALESCE(?, country_code),
                 date_of_birth = COALESCE(?, date_of_birth),
                 gender = COALESCE(?, gender), experience_level = COALESCE(?, experience_level),
                 club = COALESCE(?, club), fide_id = COALESCE(?, fide_id)
             WHERE player_id = ?`,
            [
              full_name,
              countryName,
              countryCode,
              date_of_birth || null,
              gender || 'UNDISCLOSED',
              experience_level || 'BEGINNER',
              club || null,
              fide_id || null,
              playerId
            ]
          );
        }
      }

      if (!playerId) {
        // Create new player row with default rating 1200
        const [playerInsert] = await conn.query(
          `INSERT INTO player (name, email, country, country_code, date_of_birth, gender, experience_level, club, fide_id, current_rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1200)`,
          [
            full_name,
            email,
            countryName,
            countryCode,
            date_of_birth || null,
            gender || 'UNDISCLOSED',
            experience_level || 'BEGINNER',
            club || null,
            fide_id || null
          ]
        );
        playerId = playerInsert.insertId;
      }
    }

    // Insert into app_user with username and ISO country code
    const [userInsert] = await conn.query(
      `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified, phone, organization, country_code, player_id)
       VALUES (?, ?, ?, ?, ?, 'PENDING_EMAIL', 'PENDING', 0, ?, ?, ?, ?)`,
      [
        email,
        username,
        passwordHash,
        full_name,
        role,
        phone || null,
        role === 'ORGANIZER' ? (organization || null) : null,
        countryCode,
        playerId
      ]
    );

    const newUserId = userInsert.insertId;

    // Insert into user_account (additive accounts schema)
    await conn.query(
      `INSERT INTO user_account (username, email, password_hash, role, player_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), player_id = VALUES(player_id)`,
      [username, email, passwordHash, role, playerId]
    );

    // Create 24h verification token
    const { token } = await createAuthToken(conn, {
      userId: newUserId,
      purpose: 'VERIFY_EMAIL',
      expiresInHours: 24
    });

    await conn.commit();

    // Send verification email
    await sendVerificationEmail(email, token);

    return res.status(200).json({
      message: 'Account created successfully! A verification link has been sent to your email.',
      email,
      username,
      user_id: newUserId,
      verification_token: token,
      verify_url: `/verify-email?token=${token}`
    });
  } catch (err) {
    await conn.rollback();

    // Handle race-condition duplicate key constraints safely
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      const msg = err.message || '';
      if (msg.includes('uq_user_username') || msg.includes('username')) {
        return res.status(409).json({
          error: 'This username is already taken. Please choose another.',
          field: 'username',
          code: 'USERNAME_TAKEN'
        });
      }
      if (msg.includes('email')) {
        return res.status(409).json({
          error: 'An account with this email address already exists. Please sign in.',
          field: 'email',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }
      return res.status(409).json({
        error: 'Duplicate registration entry detected. Please try again.',
        code: 'DUPLICATE_ENTRY'
      });
    }

    next(err);
  } finally {
    conn.release();
  }
};

export const verifyEmail = async (req, res, next) => {
  const { token } = req.body;
  const tokenHash = hashToken(token);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT t.token_id, t.user_id, t.expires_at, t.used_at,
              u.role, u.status, u.approval_status, u.email_verified
       FROM auth_token t
       JOIN app_user u ON u.user_id = t.user_id
       WHERE t.token_hash = ? AND t.purpose = 'VERIFY_EMAIL'`,
      [tokenHash]
    );

    if (rows.length === 0 || rows[0].used_at !== null) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Invalid or already used verification token',
        code: 'INVALID_TOKEN'
      });
    }

    const tokenRow = rows[0];
    if (new Date(tokenRow.expires_at) < new Date()) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Verification token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Mark token used
    await conn.query('UPDATE auth_token SET used_at = NOW() WHERE token_id = ?', [tokenRow.token_id]);

    // Email verification -> status ACTIVE; approval_status stays PENDING for PLAYER and ORGANIZER
    await conn.query(
      "UPDATE app_user SET email_verified = 1, status = 'ACTIVE' WHERE user_id = ?",
      [tokenRow.user_id]
    );

    await conn.commit();

    return res.status(200).json({
      message: 'Email verified successfully',
      status: 'ACTIVE'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const resendVerification = async (req, res, next) => {
  const { email: rawEmail } = req.body;
  const email = (rawEmail || '').trim().toLowerCase();
  const genericResponse = {
    message: 'If this email can be registered, a verification link has been sent'
  };

  try {
    const [users] = await pool.query(
      'SELECT user_id, email, status, email_verified FROM app_user WHERE email = ?',
      [email]
    );

    if (users.length === 0 || users[0].email_verified === 1) {
      return res.status(200).json(genericResponse);
    }

    const user = users[0];

    // 60 s cooldown check per account
    const [recentTokens] = await pool.query(
      `SELECT created_at FROM auth_token
       WHERE user_id = ? AND purpose = 'VERIFY_EMAIL'
       ORDER BY created_at DESC LIMIT 1`,
      [user.user_id]
    );

    if (recentTokens.length > 0) {
      const elapsedMs = Date.now() - new Date(recentTokens[0].created_at).getTime();
      if (elapsedMs < 60 * 1000) {
        return res.status(200).json(genericResponse);
      }
    }

    const { token } = await createAuthToken(pool, {
      userId: user.user_id,
      purpose: 'VERIFY_EMAIL',
      expiresInHours: 24
    });

    await sendVerificationEmail(email, token);

    return res.status(200).json(genericResponse);
  } catch (err) {
    next(err);
  }
};

/**
 * Login: Supports authentication via either Email or Username.
 * Secure password verification, account lockouts, role & approval status resolution.
 */
export const login = async (req, res, next) => {
  const { email: rawEmail, username: rawUsername, identifier: rawIdentifier, password } = req.body;
  const identifier = (rawEmail || rawUsername || rawIdentifier || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email or username and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id, email, username, password_hash, full_name, role, status,
              approval_status, approval_note, country_code,
              email_verified, phone, organization, player_id,
              failed_logins, locked_until, created_at, last_login_at
       FROM app_user
       WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)`,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      // Check user_account table (additive accounts schema)
      const [accRows] = await pool.query(
        `SELECT account_id, username, email, password_hash, role, player_id, created_at
         FROM user_account
         WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)`,
        [identifier, identifier]
      );

      if (accRows.length > 0) {
        const acc = accRows[0];
        const isMatch = await bcrypt.compare(password, acc.password_hash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = signToken({
          user_id: acc.account_id,
          role: acc.role,
          player_id: acc.player_id
        });
        const permissions = getPermissions(acc.role, 'APPROVED');
        return res.status(200).json({
          message: 'Login successful',
          token,
          user: {
            user_id: acc.account_id,
            account_id: acc.account_id,
            email: acc.email,
            username: acc.username,
            full_name: acc.username,
            role: acc.role,
            status: 'ACTIVE',
            approval_status: 'APPROVED',
            approval_note: null,
            country_code: null,
            email_verified: 1,
            player_id: acc.player_id,
            permissions
          }
        });
      }

      // Check admin_user table (legacy admin accounts)
      const [adminRows] = await pool.query(
        'SELECT admin_id, username, password_hash, role FROM admin_user WHERE LOWER(username) = LOWER(?)',
        [identifier]
      );
      if (adminRows.length > 0) {
        const admin = adminRows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = signToken({
          user_id: admin.admin_id,
          role: admin.role || 'ADMIN',
          player_id: null
        });
        const permissions = getPermissions(admin.role || 'ADMIN', 'APPROVED');
        return res.status(200).json({
          message: 'Login successful',
          token,
          user: {
            user_id: admin.admin_id,
            account_id: admin.admin_id,
            email: `${admin.username}@chess.admin`,
            username: admin.username,
            full_name: admin.username,
            role: admin.role || 'ADMIN',
            status: 'ACTIVE',
            approval_status: 'APPROVED',
            approval_note: null,
            email_verified: 1,
            player_id: null,
            permissions
          }
        });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account lockout before password comparison
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(429).json({
        error: 'Account is temporarily locked due to too many failed attempts. Try again later.',
        code: 'LOCKED'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const newFailed = user.failed_logins + 1;
      if (newFailed >= 5) {
        await pool.query(
          `UPDATE app_user
           SET failed_logins = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
           WHERE user_id = ?`,
          [newFailed, user.user_id]
        );
      } else {
        await pool.query(
          'UPDATE app_user SET failed_logins = ? WHERE user_id = ?',
          [newFailed, user.user_id]
        );
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Password matched: check verification and suspension status
    if (user.status === 'PENDING_EMAIL') {
      return res.status(403).json({
        error: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Account has been suspended',
        code: 'SUSPENDED'
      });
    }

    // Status is ACTIVE: reset failed_logins, locked_until and update last_login_at
    await pool.query(
      'UPDATE app_user SET failed_logins = 0, locked_until = NULL, last_login_at = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    const token = signToken({
      user_id: user.user_id,
      role: user.role,
      player_id: user.player_id
    });

    const permissions = getPermissions(user.role, user.approval_status);

    const userResponse = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      approval_status: user.approval_status,
      approval_note: user.approval_note,
      country_code: user.country_code,
      email_verified: user.email_verified,
      phone: user.phone,
      organization: user.organization,
      player_id: user.player_id,
      created_at: user.created_at,
      last_login_at: new Date(),
      permissions
    };

    if (user.player_id) {
      const [playerRows] = await pool.query(
        'SELECT player_id, name, email, country, country_code, date_of_birth, gender, experience_level, club, fide_id, current_rating FROM player WHERE player_id = ?',
        [user.player_id]
      );
      if (playerRows.length > 0) {
        userResponse.player = playerRows[0];
      }
    }

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: userResponse,
      permissions,
      approval_status: user.approval_status,
      approval_note: user.approval_note
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  const { email: rawEmail } = req.body;
  const email = (rawEmail || '').trim().toLowerCase();
  const genericResponse = {
    message: 'If this email is registered, password reset instructions have been sent'
  };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [users] = await conn.query(
      'SELECT user_id, email FROM app_user WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      const user = users[0];
      // Invalidate older unused reset tokens
      await conn.query(
        `UPDATE auth_token
         SET used_at = NOW()
         WHERE user_id = ? AND purpose = 'RESET_PASSWORD' AND used_at IS NULL`,
        [user.user_id]
      );

      // Create new 1h reset token
      const { token } = await createAuthToken(conn, {
        userId: user.user_id,
        purpose: 'RESET_PASSWORD',
        expiresInHours: 1
      });

      await conn.commit();
      await sendPasswordResetEmail(email, token);
    } else {
      await conn.commit();
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;
  const tokenHash = hashToken(token);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tokens] = await conn.query(
      `SELECT token_id, user_id, expires_at, used_at
       FROM auth_token
       WHERE token_hash = ? AND purpose = 'RESET_PASSWORD'`,
      [tokenHash]
    );

    if (tokens.length === 0 || tokens[0].used_at !== null) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Invalid or already used reset token',
        code: 'INVALID_TOKEN'
      });
    }

    const tokenRow = tokens[0];
    if (new Date(tokenRow.expires_at) < new Date()) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Reset token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Mark token used
    await conn.query('UPDATE auth_token SET used_at = NOW() WHERE token_id = ?', [tokenRow.token_id]);

    // Update password hash and reset failed_logins / locked_until
    await conn.query(
      `UPDATE app_user
       SET password_hash = ?, failed_logins = 0, locked_until = NULL
       WHERE user_id = ?`,
      [newHash, tokenRow.user_id]
    );

    await conn.commit();

    return res.status(200).json({
      message: 'Password has been reset successfully'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, email, username, full_name, role, status, approval_status, approval_note, email_verified,
              phone, organization, country_code, player_id, created_at, last_login_at
       FROM app_user WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    user.permissions = getPermissions(user.role, user.approval_status);

    if (user.player_id) {
      const [playerRows] = await pool.query(
        'SELECT player_id, name, email, country, country_code, date_of_birth, gender, experience_level, club, fide_id, current_rating FROM player WHERE player_id = ?',
        [user.player_id]
      );
      if (playerRows.length > 0) {
        user.player = playerRows[0];
      }
    }

    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  const { id_token, role: requestedRole = 'PLAYER' } = req.body;

  if (!id_token) {
    return res.status(400).json({ error: 'id_token is required', message: 'id_token is required' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: env.GOOGLE_CLIENT_ID || undefined
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(400).json({
      error: 'Invalid Google token',
      message: 'Invalid Google token',
      details: err.message
    });
  }

  if (!payload || !payload.email_verified) {
    return res.status(400).json({
      error: 'Google email is not verified',
      message: 'Google email is not verified'
    });
  }

  const googleSub = payload.sub;
  const email = (payload.email || '').trim().toLowerCase();
  const fullName = payload.name || email.split('@')[0] || 'Google User';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let [users] = await conn.query(
      `SELECT user_id, email, username, full_name, role, status, approval_status, approval_note,
              email_verified, phone, organization, country_code, player_id, google_sub
       FROM app_user WHERE google_sub = ?`,
      [googleSub]
    );

    let user = users[0];

    if (!user) {
      // Check if user exists with this email
      const [emailUsers] = await conn.query(
        `SELECT user_id, email, username, full_name, role, status, approval_status, approval_note,
                email_verified, phone, organization, country_code, player_id, google_sub
         FROM app_user WHERE email = ?`,
        [email]
      );

      if (emailUsers.length > 0) {
        user = emailUsers[0];
        await conn.query(
          'UPDATE app_user SET google_sub = ?, email_verified = 1 WHERE user_id = ?',
          [googleSub, user.user_id]
        );
        user.google_sub = googleSub;
        user.email_verified = 1;
      } else {
        // Create new account
        const role = requestedRole === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';
        let playerId = null;

        if (role === 'PLAYER') {
          const [existingPlayers] = await conn.query(
            'SELECT player_id FROM player WHERE email = ?',
            [email]
          );

          if (existingPlayers.length > 0) {
            playerId = existingPlayers[0].player_id;
          } else {
            const [playerInsert] = await conn.query(
              `INSERT INTO player (name, email, current_rating, date_of_birth, gender)
               VALUES (?, ?, 1200, NULL, NULL)`,
              [fullName, email]
            );
            playerId = playerInsert.insertId;
          }
        }

        const usernameBase = email.split('@')[0].replace(/[^A-Za-z0-9_]/g, '').slice(0, 10) || 'google_user';
        const uniqueUsername = `${usernameBase}_${Date.now().toString().slice(-6)}`.slice(0, 20);

        const [userInsert] = await conn.query(
          `INSERT INTO app_user (email, username, full_name, role, status, approval_status, email_verified, google_sub, player_id)
           VALUES (?, ?, ?, ?, 'ACTIVE', 'PENDING', 1, ?, ?)`,
          [email, uniqueUsername, fullName, role, googleSub, playerId]
        );

        const [createdUsers] = await conn.query(
          `SELECT user_id, email, username, full_name, role, status, approval_status, approval_note,
                  email_verified, phone, organization, country_code, player_id, google_sub
           FROM app_user WHERE user_id = ?`,
          [userInsert.insertId]
        );
        user = createdUsers[0];
      }
    }

    if (user.status === 'SUSPENDED') {
      await conn.rollback();
      return res.status(403).json({
        error: 'Account has been suspended',
        code: 'SUSPENDED'
      });
    }

    await conn.query('UPDATE app_user SET last_login_at = NOW(), failed_logins = 0 WHERE user_id = ?', [user.user_id]);
    await conn.commit();

    let playerRow = null;
    let profileComplete = true;

    if (user.role === 'PLAYER') {
      if (user.player_id) {
        const [pRows] = await pool.query(
          'SELECT player_id, name, country, country_code, date_of_birth, gender, experience_level, club, fide_id, current_rating FROM player WHERE player_id = ?',
          [user.player_id]
        );
        playerRow = pRows[0] || null;
      }
      if (!playerRow || !playerRow.country) {
        profileComplete = false;
      }
    } else if (user.role === 'ORGANIZER') {
      if (!user.phone || !user.organization) {
        profileComplete = false;
      }
    }

    const token = signToken({
      user_id: user.user_id,
      role: user.role,
      player_id: user.player_id
    });

    const permissions = getPermissions(user.role, user.approval_status);

    return res.status(200).json({
      message: 'Google login successful',
      token,
      profile_complete: profileComplete,
      user: {
        ...user,
        player: playerRow,
        permissions
      },
      permissions,
      approval_status: user.approval_status,
      approval_note: user.approval_note
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const updateProfile = async (req, res, next) => {
  const {
    full_name,
    username,
    phone,
    organization,
    country,
    country_code: rawCountryCode,
    date_of_birth,
    gender,
    experience_level,
    club,
    fide_id
  } = req.body;
  const userId = req.user.user_id;

  const resolved = resolveCountryData(rawCountryCode || country || '');
  const countryCode = resolved.code;
  const countryName = resolved.name || country;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userRows] = await conn.query(
      'SELECT user_id, role, player_id, status, approval_status, approval_note FROM app_user WHERE user_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // If username is changing, verify uniqueness
    if (username) {
      const [existingUsernames] = await conn.query(
        'SELECT user_id FROM app_user WHERE LOWER(username) = LOWER(?) AND user_id != ?',
        [username, userId]
      );
      if (existingUsernames.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          error: 'This username is already taken. Please choose another.',
          field: 'username'
        });
      }
    }

    const userUpdates = [];
    const userValues = [];

    if (full_name !== undefined) {
      userUpdates.push('full_name = ?');
      userValues.push(full_name);
    }
    if (username !== undefined) {
      userUpdates.push('username = ?');
      userValues.push(username);
    }
    if (countryCode !== null && countryCode !== undefined) {
      userUpdates.push('country_code = ?');
      userValues.push(countryCode);
    }
    if (phone !== undefined) {
      userUpdates.push('phone = ?');
      userValues.push(phone);
    }
    if (organization !== undefined) {
      userUpdates.push('organization = ?');
      userValues.push(organization);
    }

    if (userUpdates.length > 0) {
      userValues.push(userId);
      await conn.query(
        `UPDATE app_user SET ${userUpdates.join(', ')} WHERE user_id = ?`,
        userValues
      );
    }

    if (user.player_id) {
      const playerUpdates = [];
      const playerValues = [];

      if (full_name !== undefined) {
        playerUpdates.push('name = ?');
        playerValues.push(full_name);
      }
      if (countryName !== undefined && countryName !== null) {
        playerUpdates.push('country = ?');
        playerValues.push(countryName);
      }
      if (countryCode !== undefined && countryCode !== null) {
        playerUpdates.push('country_code = ?');
        playerValues.push(countryCode);
      }
      if (date_of_birth !== undefined) {
        playerUpdates.push('date_of_birth = ?');
        playerValues.push(date_of_birth);
      }
      if (gender !== undefined) {
        playerUpdates.push('gender = ?');
        playerValues.push(gender);
      }
      if (experience_level !== undefined) {
        playerUpdates.push('experience_level = ?');
        playerValues.push(experience_level);
      }
      if (club !== undefined) {
        playerUpdates.push('club = ?');
        playerValues.push(club);
      }
      if (fide_id !== undefined) {
        playerUpdates.push('fide_id = ?');
        playerValues.push(fide_id);
      }

      if (playerUpdates.length > 0) {
        playerValues.push(user.player_id);
        await conn.query(
          `UPDATE player SET ${playerUpdates.join(', ')} WHERE player_id = ?`,
          playerValues
        );
      }
    }

    await conn.commit();

    const [updatedRows] = await pool.query(
      `SELECT user_id, email, username, full_name, role, status, approval_status, approval_note, email_verified,
              phone, organization, country_code, player_id, created_at, last_login_at
       FROM app_user WHERE user_id = ?`,
      [userId]
    );

    const updatedUser = updatedRows[0];
    let playerRow = null;

    if (updatedUser.player_id) {
      const [pRows] = await pool.query(
        'SELECT player_id, name, country, country_code, date_of_birth, gender, experience_level, club, fide_id, current_rating FROM player WHERE player_id = ?',
        [updatedUser.player_id]
      );
      playerRow = pRows[0] || null;
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        player: playerRow,
        permissions: getPermissions(updatedUser.role, updatedUser.approval_status)
      }
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const changePassword = async (req, res, next) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.user_id;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, password_hash FROM app_user WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Account does not have a local password set' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query('UPDATE app_user SET password_hash = ? WHERE user_id = ?', [newHash, userId]);

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

export default {
  checkUsername,
  checkEmail,
  register,
  verifyEmail,
  resendVerification,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema
};
