process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'console';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import {
  setGoogleVerifierStub,
  resetGoogleVerifierStub
} from '../src/services/googleVerifier.js';

const PORT = 5059;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runSuite = async () => {
  console.log('======================================================================');
  console.log('--- Google Sign-In & Onboarding Verification Suite ---');
  console.log('======================================================================\n');

  // Safety check: Ensure connected database is chess_scratch
  const [dbResult] = await pool.query('SELECT DATABASE() AS db');
  const currentDb = dbResult[0]?.db;
  if (currentDb !== 'chess_scratch') {
    console.error(`FATAL: Connected database is "${currentDb}", but must be "chess_scratch"! Aborting.`);
    process.exit(1);
  }
  console.log(`[Safety Check] Confirmed database in use: ${currentDb}`);

  const app = createApp();
  const server = app.listen(PORT);
  console.log(`Test server running at ${BASE_URL}\n`);

  const RUN_ID = Date.now();
  let passedCount = 0;
  let totalCount = 0;

  const record = (name, condition, details = '') => {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✅ PASS - ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`❌ FAIL - ${name} ${details ? `-> ${details}` : ''}`);
    }
  };

  try {
    // -----------------------------------------------------------------
    // 1. GOOGLE_DISABLED when GOOGLE_CLIENT_ID is not configured
    // -----------------------------------------------------------------
    console.log('--- 1. GOOGLE_DISABLED Route Checks ---');
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = '';

    const disRes1 = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'dummy_token' })
    });
    const disJson1 = await disRes1.json();
    record('POST /api/auth/google answers 503 GOOGLE_DISABLED when client ID unset',
      disRes1.status === 503 && disJson1.code === 'GOOGLE_DISABLED'
    );

    const disRes2 = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_token: 'dummy' })
    });
    const disJson2 = await disRes2.json();
    record('POST /api/auth/google/complete answers 503 GOOGLE_DISABLED when client ID unset',
      disRes2.status === 503 && disJson2.code === 'GOOGLE_DISABLED'
    );

    // Restore client ID for subsequent tests
    process.env.GOOGLE_CLIENT_ID = originalClientId || 'test-google-client-id.apps.googleusercontent.com';

    // -----------------------------------------------------------------
    // 2. Unverified Google Email & Invalid Token Rejected
    // -----------------------------------------------------------------
    console.log('\n--- 2. Google Token Verification Rejections ---');

    // Stub returns email_verified = false
    setGoogleVerifierStub(async () => ({
      sub: 'stub_unverified_sub',
      email: `unverified_${RUN_ID}@test.local`,
      email_verified: false,
      name: 'Unverified Google'
    }));

    const unverRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_unverified' })
    });
    const unverJson = await unverRes.json();
    record('POST /api/auth/google rejects unverified Google email with 401 INVALID_GOOGLE_TOKEN',
      unverRes.status === 401 && unverJson.code === 'INVALID_GOOGLE_TOKEN'
    );

    // Stub throws error (verification failure)
    setGoogleVerifierStub(async () => {
      const err = new Error('OAuth token expired or invalid');
      err.status = 401;
      throw err;
    });

    const failRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_corrupt' })
    });
    const failJson = await failRes.json();
    record('POST /api/auth/google rejects failed verification with 401 INVALID_GOOGLE_TOKEN',
      failRes.status === 401 && failJson.code === 'INVALID_GOOGLE_TOKEN'
    );

    // -----------------------------------------------------------------
    // 3. New User Flow (needs_registration -> complete -> account PENDING)
    // -----------------------------------------------------------------
    console.log('\n--- 3. New User Flow ---');
    const newGoogleSub = `gsub_new_${RUN_ID}`;
    const newGoogleEmail = `newplayer_${RUN_ID}@test.local`;
    const newGoogleName = 'Brand New Grandmaster';

    setGoogleVerifierStub(async () => ({
      sub: newGoogleSub,
      email: newGoogleEmail,
      email_verified: true,
      name: newGoogleName
    }));

    const newRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_new_user' })
    });
    const newJson = await newRes.json();

    record('Step 1 returns 200 needs_registration: true with registration_token and prefill',
      newRes.status === 200 &&
      newJson.needs_registration === true &&
      typeof newJson.registration_token === 'string' &&
      newJson.prefill?.email === newGoogleEmail &&
      newJson.prefill?.full_name === newGoogleName
    );

    // Rule check: Nothing is written to the database before profile completion
    const [emptyCheckUsers] = await pool.query(
      'SELECT user_id FROM app_user WHERE email = ? OR google_sub = ?',
      [newGoogleEmail, newGoogleSub]
    );
    record('Rule confirmed: NOTHING written to database during Step 1', emptyCheckUsers.length === 0);

    const registrationToken = newJson.registration_token;

    // Step 2: Complete registration with profile data
    const newUsername = `gplayer_${RUN_ID.toString().slice(-8)}`;
    const compRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: registrationToken,
        role: 'PLAYER',
        username: newUsername,
        full_name: newGoogleName,
        country_code: 'US',
        date_of_birth: '1998-07-20',
        gender: 'MALE',
        experience_level: 'ADVANCED',
        accept_terms: true
      })
    });
    const compJson = await compRes.json();

    record('Step 2 completes registration successfully with status 200',
      compRes.status === 200 && compJson.token && compJson.user
    );
    record('User profile has status ACTIVE and approval_status PENDING',
      compJson.user?.status === 'ACTIVE' && compJson.user?.approval_status === 'PENDING'
    );

    // DB Verification
    const [dbNewUsers] = await pool.query(
      `SELECT user_id, email, username, password_hash, role, status, approval_status,
              email_verified, google_sub, player_id
       FROM app_user WHERE email = ?`,
      [newGoogleEmail]
    );
    record('app_user created with password_hash NULL, google_sub set, email_verified 1, ACTIVE, PENDING',
      dbNewUsers.length === 1 &&
      dbNewUsers[0].password_hash === null &&
      dbNewUsers[0].google_sub === newGoogleSub &&
      dbNewUsers[0].email_verified === 1 &&
      dbNewUsers[0].status === 'ACTIVE' &&
      dbNewUsers[0].approval_status === 'PENDING'
    );

    const [dbNewPlayers] = await pool.query(
      'SELECT player_id, name, country_code, current_rating, date_of_birth FROM player WHERE player_id = ?',
      [dbNewUsers[0]?.player_id]
    );
    record('Linked player row created with rating 1200 and profile fields',
      dbNewPlayers.length === 1 &&
      dbNewPlayers[0].current_rating === 1200 &&
      dbNewPlayers[0].country_code === 'US'
    );

    // Audit Log Verification
    const [auditLogs] = await pool.query(
      `SELECT action, entity, entity_id FROM audit_log
       WHERE actor_user_id = ? ORDER BY log_id ASC`,
      [dbNewUsers[0]?.user_id]
    );
    const actions = auditLogs.map(a => a.action);
    record('Audit log contains both REGISTER and LINK_GOOGLE entries',
      actions.includes('REGISTER') && actions.includes('LINK_GOOGLE')
    );

    // -----------------------------------------------------------------
    // 4. Invalid and Expired Registration Token
    // -----------------------------------------------------------------
    console.log('\n--- 4. Registration Token Validation Checks ---');

    const invalidTokRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: 'not.a.real.jwt.token',
        role: 'PLAYER',
        username: `tokerr_${RUN_ID.toString().slice(-6)}`,
        full_name: 'Token Error',
        date_of_birth: '1995-01-01',
        gender: 'OTHER',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    record('Invalid registration token rejected with 401', invalidTokRes.status === 401);

    const expiredToken = jwt.sign(
      { sub: 'sub_expired', email: 'expired@test.local', purpose: 'google_signup' },
      env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expTokRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: expiredToken,
        role: 'PLAYER',
        username: `tokexp_${RUN_ID.toString().slice(-6)}`,
        full_name: 'Token Expired',
        date_of_birth: '1995-01-01',
        gender: 'OTHER',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    const expTokJson = await expTokRes.json();
    record('Expired registration token rejected with 401 TOKEN_EXPIRED',
      expTokRes.status === 401 && expTokJson.code === 'TOKEN_EXPIRED'
    );

    const wrongPurposeToken = jwt.sign(
      { sub: 'sub_wrong_purpose', email: 'purpose@test.local', purpose: 'password_reset' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const wrongPurpRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: wrongPurposeToken,
        role: 'PLAYER',
        username: `purp_${RUN_ID.toString().slice(-6)}`,
        full_name: 'Wrong Purpose',
        date_of_birth: '1995-01-01',
        gender: 'OTHER',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    record('Token with incorrect purpose rejected with 401 INVALID_TOKEN', wrongPurpRes.status === 401);

    // -----------------------------------------------------------------
    // 5. Token Email Cannot Be Overridden by Request Body
    // -----------------------------------------------------------------
    console.log('\n--- 5. Email Override Tampering Protection ---');
    const tamperSub = `gsub_tamper_${RUN_ID}`;
    const tamperTokenEmail = `legit_token_${RUN_ID}@test.local`;
    const tamperToken = jwt.sign(
      { sub: tamperSub, email: tamperTokenEmail, purpose: 'google_signup', name: 'Tamper Tester' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const tamperRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: tamperToken,
        email: `hacker_override_${RUN_ID}@test.local`, // Malicious attempt to override email
        sub: 'hacker_sub',
        role: 'PLAYER',
        username: `tamper_${RUN_ID.toString().slice(-8)}`,
        full_name: 'Tamper Tester',
        country_code: 'FR',
        date_of_birth: '1992-03-10',
        gender: 'MALE',
        experience_level: 'EXPERT',
        accept_terms: true
      })
    });
    const tamperJson = await tamperRes.json();

    record('Registration complete ignores request body email and sub',
      tamperRes.status === 200 &&
      tamperJson.user?.email === tamperTokenEmail
    );

    const [tamperUser] = await pool.query(
      'SELECT email, google_sub FROM app_user WHERE google_sub = ?',
      [tamperSub]
    );
    record('app_user record stored with token email, not body override',
      tamperUser.length === 1 &&
      tamperUser[0].email === tamperTokenEmail
    );

    // -----------------------------------------------------------------
    // 6. Existing google_sub Login
    // -----------------------------------------------------------------
    console.log('\n--- 6. Existing google_sub Login ---');
    setGoogleVerifierStub(async () => ({
      sub: newGoogleSub,
      email: newGoogleEmail,
      email_verified: true,
      name: newGoogleName
    }));

    const existingLoginRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_existing' })
    });
    const existingLoginJson = await existingLoginRes.json();

    record('Existing linked google_sub logs in directly with 200',
      existingLoginRes.status === 200 &&
      existingLoginJson.token &&
      existingLoginJson.user?.email === newGoogleEmail &&
      existingLoginJson.permissions
    );

    // -----------------------------------------------------------------
    // 7. Linking a Verified Account
    // -----------------------------------------------------------------
    console.log('\n--- 7. Linking a Verified Account ---');
    const verifiedEmail = `verified_user_${RUN_ID}@test.local`;
    const verifiedUsername = `ver_${RUN_ID.toString().slice(-8)}`;
    const samplePass = 'SecretPass123!';
    const passHash = await bcrypt.hash(samplePass, 12);

    const [verInsert] = await pool.query(
      `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified, country_code)
       VALUES (?, ?, ?, 'Verified Member', 'ORGANIZER', 'ACTIVE', 'APPROVED', 1, 'IN')`,
      [verifiedEmail, verifiedUsername, passHash]
    );
    const verifiedUserId = verInsert.insertId;

    const linkSub = `gsub_link_${RUN_ID}`;
    setGoogleVerifierStub(async () => ({
      sub: linkSub,
      email: verifiedEmail,
      email_verified: true,
      name: 'Verified Member'
    }));

    const linkRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_link_verified' })
    });
    const linkJson = await linkRes.json();

    record('Linking verified account returns 200 with linked: true',
      linkRes.status === 200 &&
      linkJson.linked === true &&
      linkJson.token
    );

    const [linkedDbUser] = await pool.query(
      'SELECT password_hash, role, approval_status, google_sub FROM app_user WHERE user_id = ?',
      [verifiedUserId]
    );
    record('Verified account gets google_sub linked while keeping password_hash, role, and approval_status',
      linkedDbUser.length === 1 &&
      linkedDbUser[0].google_sub === linkSub &&
      linkedDbUser[0].password_hash !== null &&
      linkedDbUser[0].role === 'ORGANIZER' &&
      linkedDbUser[0].approval_status === 'APPROVED'
    );

    // -----------------------------------------------------------------
    // 8. The Takeover Case (Unverified Password Account)
    // -----------------------------------------------------------------
    console.log('\n--- 8. The Takeover Case (Unverified Password Account) ---');
    const takeoverEmail = `takeover_${RUN_ID}@test.local`;
    const takeoverUsername = `take_${RUN_ID.toString().slice(-8)}`;
    const [takeoverInsert] = await pool.query(
      `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified, country_code)
       VALUES (?, ?, ?, 'Takeover Candidate', 'PLAYER', 'PENDING_EMAIL', 'PENDING', 0, 'DE')`,
      [takeoverEmail, takeoverUsername, passHash]
    );
    const takeoverUserId = takeoverInsert.insertId;

    // Insert outstanding verification token (64 hex chars)
    const dummyHash = 'a'.repeat(64);
    await pool.query(
      `INSERT INTO auth_token (user_id, token_hash, purpose, expires_at)
       VALUES (?, ?, 'VERIFY_EMAIL', DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [takeoverUserId, dummyHash]
    );

    const takeoverSub = `gsub_takeover_${RUN_ID}`;
    setGoogleVerifierStub(async () => ({
      sub: takeoverSub,
      email: takeoverEmail,
      email_verified: true,
      name: 'Takeover Candidate'
    }));

    const takeRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_takeover' })
    });
    const takeJson = await takeRes.json();

    record('Takeover case returns 200 with linked: true',
      takeRes.status === 200 && takeJson.linked === true
    );

    const [takeoverDbUser] = await pool.query(
      'SELECT password_hash, email_verified, status, approval_status, role, google_sub FROM app_user WHERE user_id = ?',
      [takeoverUserId]
    );
    record('Takeover: google_sub linked, password_hash SET TO NULL, email_verified 1, status ACTIVE',
      takeoverDbUser.length === 1 &&
      takeoverDbUser[0].google_sub === takeoverSub &&
      takeoverDbUser[0].password_hash === null &&
      takeoverDbUser[0].email_verified === 1 &&
      takeoverDbUser[0].status === 'ACTIVE'
    );
    record('Takeover: role and approval_status never modified',
      takeoverDbUser[0].role === 'PLAYER' &&
      takeoverDbUser[0].approval_status === 'PENDING'
    );

    const [takeoverTokens] = await pool.query(
      'SELECT token_id FROM auth_token WHERE user_id = ? AND purpose = "VERIFY_EMAIL"',
      [takeoverUserId]
    );
    record('Takeover: outstanding verification tokens deleted', takeoverTokens.length === 0);

    // -----------------------------------------------------------------
    // 9. Accounts Without a Password (Password Login & Forgot Password)
    // -----------------------------------------------------------------
    console.log('\n--- 9. Passwordless Account Login & Forgot-Password Flow ---');
    // Password login for account without password returns generic wrong-credentials 401
    const pwLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: takeoverEmail,
        password: 'AttemptPassword123!'
      })
    });
    record('Password login for passwordless account returns generic 401 Invalid email or password',
      pwLoginRes.status === 401
    );

    // Forgot password lets passwordless accounts set one
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: takeoverEmail })
    });
    record('Forgot password returns 200 generic message for passwordless account', forgotRes.status === 200);

    // Retrieve generated reset token from auth_token table
    const [resetTokenRows] = await pool.query(
      `SELECT token_hash FROM auth_token
       WHERE user_id = ? AND purpose = 'RESET_PASSWORD' AND used_at IS NULL
       ORDER BY token_id DESC LIMIT 1`,
      [takeoverUserId]
    );
    record('Password reset token generated for passwordless user in database', resetTokenRows.length === 1);

    // Simulate reset-password endpoint with direct hash test or known reset
    const newResetPassword = 'BrandNewPassword99!';
    // Create new token directly through tokens utility to test resetPassword route
    const rawResetToken = 'raw_reset_token_test_1234567890abcdef12345678';
    const rawTokenHash = (await import('../src/utils/tokens.js')).hashToken(rawResetToken);
    await pool.query(
      `INSERT INTO auth_token (user_id, token_hash, purpose, expires_at)
       VALUES (?, ?, 'RESET_PASSWORD', DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [takeoverUserId, rawTokenHash]
    );

    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: rawResetToken,
        password: newResetPassword,
        confirm_password: newResetPassword
      })
    });
    record('Reset password endpoint successfully sets new password for user', resetRes.status === 200);

    // Login with new password now succeeds
    const pwSuccessRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: takeoverEmail,
        password: newResetPassword
      })
    });
    record('User can now successfully log in with newly set password', pwSuccessRes.status === 200);

    // -----------------------------------------------------------------
    // 10. Suspended User Blocked
    // -----------------------------------------------------------------
    console.log('\n--- 10. Suspended User Access Block ---');
    // Case A: User with linked google_sub is SUSPENDED
    const suspendedEmailA = `suspended_a_${RUN_ID}@test.local`;
    const suspendedSubA = `gsub_suspended_a_${RUN_ID}`;
    await pool.query(
      `INSERT INTO app_user (email, username, full_name, role, status, approval_status, email_verified, google_sub)
       VALUES (?, ?, 'Suspended A', 'PLAYER', 'SUSPENDED', 'PENDING', 1, ?)`,
      [suspendedEmailA, `suspa_${RUN_ID.toString().slice(-7)}`, suspendedSubA]
    );

    setGoogleVerifierStub(async () => ({
      sub: suspendedSubA,
      email: suspendedEmailA,
      email_verified: true,
      name: 'Suspended A'
    }));

    const suspResA = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_suspended_a' })
    });
    const suspJsonA = await suspResA.json();
    record('Suspended user with linked google_sub blocked with 403 SUSPENDED',
      suspResA.status === 403 && suspJsonA.code === 'SUSPENDED'
    );

    // Case B: Existing account by email is SUSPENDED (not yet linked)
    const suspendedEmailB = `suspended_b_${RUN_ID}@test.local`;
    const suspendedSubB = `gsub_suspended_b_${RUN_ID}`;
    await pool.query(
      `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified)
       VALUES (?, ?, ?, 'Suspended B', 'PLAYER', 'SUSPENDED', 'PENDING', 1)`,
      [suspendedEmailB, `suspb_${RUN_ID.toString().slice(-7)}`, passHash]
    );

    setGoogleVerifierStub(async () => ({
      sub: suspendedSubB,
      email: suspendedEmailB,
      email_verified: true,
      name: 'Suspended B'
    }));

    const suspResB = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'token_suspended_b' })
    });
    const suspJsonB = await suspResB.json();
    record('Suspended user with matching email blocked with 403 SUSPENDED',
      suspResB.status === 403 && suspJsonB.code === 'SUSPENDED'
    );

    // -----------------------------------------------------------------
    // 11. Role ADMIN Cannot Be Requested in Complete
    // -----------------------------------------------------------------
    console.log('\n--- 11. Admin Role Privilege Escalation Block ---');
    const adminReqToken = jwt.sign(
      { sub: `gsub_admin_${RUN_ID}`, email: `adminreq_${RUN_ID}@test.local`, purpose: 'google_signup', name: 'Wannabe Admin' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const adminReqRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: adminReqToken,
        role: 'ADMIN',
        username: `admin_${RUN_ID.toString().slice(-8)}`,
        full_name: 'Wannabe Admin',
        accept_terms: true
      })
    });
    record('role ADMIN cannot be requested and is rejected with 400', adminReqRes.status === 400);

    // -----------------------------------------------------------------
    // 12. Duplicate Username 409 & Reserved Usernames
    // -----------------------------------------------------------------
    console.log('\n--- 12. Duplicate & Reserved Username Checks ---');
    const dupUserToken = jwt.sign(
      { sub: `gsub_dup_${RUN_ID}`, email: `dupuser_${RUN_ID}@test.local`, purpose: 'google_signup', name: 'Dup User' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Attempt registration with existing username (newUsername from section 3)
    const dupUsernameRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: dupUserToken,
        role: 'PLAYER',
        username: newUsername,
        full_name: 'Duplicate Username Candidate',
        date_of_birth: '1990-05-15',
        gender: 'FEMALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const dupUsernameJson = await dupUsernameRes.json();
    record('Duplicate username in complete returns 409 USERNAME_TAKEN',
      dupUsernameRes.status === 409 && dupUsernameJson.code === 'USERNAME_TAKEN'
    );

    // Attempt registration with reserved username
    const resUsernameRes = await fetch(`${BASE_URL}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_token: dupUserToken,
        role: 'PLAYER',
        username: 'admin',
        full_name: 'Reserved Username Candidate',
        date_of_birth: '1990-05-15',
        gender: 'FEMALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const resUsernameJson = await resUsernameRes.json();
    record('Reserved username in complete returns 409 USERNAME_TAKEN',
      resUsernameRes.status === 409 && resUsernameJson.code === 'USERNAME_TAKEN'
    );

  } catch (err) {
    console.error('Unexpected test error occurred:', err);
  } finally {
    resetGoogleVerifierStub();

    console.log('\n--- Cleaning up test records in chess_scratch (*@test.local) ---');
    try {
      await pool.query(
        `DELETE FROM audit_log WHERE actor_user_id IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );
      await pool.query(
        `DELETE FROM auth_token WHERE user_id IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );
      await pool.query(
        `DELETE FROM player WHERE email LIKE '%@test.local'`
      );
      await pool.query(
        `DELETE FROM app_user WHERE email LIKE '%@test.local'`
      );
      console.log('Test records cleanup completed successfully.');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    }

    server.close();
    console.log(`\n======================================================================`);
    console.log(`Google Auth Suite: ${passedCount}/${totalCount} tests passed.`);
    console.log(`======================================================================`);
    process.exit(passedCount === totalCount ? 0 : 1);
  }
};

runSuite();
