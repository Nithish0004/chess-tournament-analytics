import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import createApp from '../src/app.js';
import {
  getLastCapturedEmail,
  clearCapturedEmails,
  sendVerificationOtpEmail
} from '../src/services/mailService.js';
import { issueOtp, verifyOtp, hashCode, generateCode } from '../src/services/otpService.js';
import axios from 'axios';
import http from 'http';

// Safety Guard: Must only run against chess_scratch
const [rows] = await pool.query('SELECT DATABASE() AS db');
const currentDb = rows[0]?.db;
if (currentDb !== 'chess_scratch') {
  console.error(`FATAL: test-otp-flow must only run against chess_scratch. Current database is: ${currentDb}`);
  process.exit(1);
}

console.log(`Starting OTP verification & password reset test suite on database: ${currentDb}\n`);

// Record baseline counts
const [baseUsers] = await pool.query('SELECT COUNT(*) AS cnt FROM app_user');
const [baseOtps] = await pool.query('SELECT COUNT(*) AS cnt FROM email_otp');
const [baseAudits] = await pool.query('SELECT COUNT(*) AS cnt FROM audit_log');
const baseline = {
  users: baseUsers[0].cnt,
  otps: baseOtps[0].cnt,
  audits: baseAudits[0].cnt
};
console.log('Baseline counts before test:', baseline);
const [maxLogRes] = await pool.query('SELECT MAX(log_id) AS maxId FROM audit_log');
const startAuditLogId = maxLogRes[0]?.maxId || 0;

// Start ephemeral Express app on random port
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const api = axios.create({
  baseURL: `http://localhost:${port}/api/auth`,
  validateStatus: () => true // Do not throw on 4xx/5xx
});

const cleanupTestRecords = async () => {
  // Find test user IDs
  const [testUsers] = await pool.query("SELECT user_id FROM app_user WHERE email LIKE '%@test.local'");
  const userIds = testUsers.map((u) => u.user_id);

  if (userIds.length > 0) {
    await pool.query('DELETE FROM email_otp WHERE user_id IN (?)', [userIds]);
    await pool.query('DELETE FROM user_account WHERE email LIKE "%@test.local"');
    await pool.query('DELETE FROM app_user WHERE user_id IN (?)', [userIds]);
  }
  await pool.query('DELETE FROM audit_log WHERE log_id > ?', [startAuditLogId]);
};

let allTestsPassed = true;
const assert = (condition, message) => {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    allTestsPassed = false;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
  }
};

try {
  // Ensure starting with clean slate
  await cleanupTestRecords();

  console.log('\n--- Test 1: generateCode & hashCode & DB plain-text absence ---');
  const code = generateCode();
  assert(/^\d{6}$/.test(code), 'generateCode produces a 6-digit zero-padded string');
  const hash = hashCode(999, 'VERIFY_EMAIL', code);
  assert(hash.length === 64 && /^[0-9a-f]{64}$/.test(hash), 'hashCode returns a 64-char HMAC-SHA256 hex string');
  assert(hash !== code, 'Stored hash does NOT equal the plain-text code');

  console.log('\n--- Test 2: Manual Registration with 6-digit OTP ---');
  clearCapturedEmails();
  const testEmail1 = `otp_test_${Date.now()}_1@test.local`;
  const regRes = await api.post('/register', {
    role: 'PLAYER',
    email: testEmail1,
    username: `otp_u1_${Date.now().toString().slice(-6)}`,
    password: 'Password123!',
    confirm_password: 'Password123!',
    full_name: 'OTP Test Player 1',
    date_of_birth: '1995-05-15',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    country: 'United States',
    accept_terms: true
  });

  assert(regRes.status === 200, `Registration returned status 200 (got ${regRes.status})`);
  assert(regRes.data.expires_in === 600, 'Registration response has expires_in: 600');
  assert(regRes.data.resend_after === 60, 'Registration response has resend_after: 60');

  // Verify DB record has no plain-text code
  const [otpRow] = await pool.query(
    'SELECT code_hash, attempts, max_attempts FROM email_otp WHERE user_id = ?',
    [regRes.data.user_id]
  );
  assert(otpRow.length === 1, 'email_otp row created in database');
  assert(otpRow[0].code_hash.length === 64, 'email_otp.code_hash is 64 hex characters');

  const capturedMail = getLastCapturedEmail();
  assert(capturedMail && capturedMail.code, 'Mailer captured the verification OTP code');
  const issuedCode = capturedMail.code;
  assert(issuedCode !== otpRow[0].code_hash, 'DB stores hash, not plain-text code');

  console.log('\n--- Test 3: Old Link-Based Routes Answer 410 ---');
  const linkVerifyRes = await api.post('/verify-email', { token: 'legacy-token-123' });
  assert(linkVerifyRes.status === 410, `POST /verify-email with token answered 410 (got ${linkVerifyRes.status})`);
  const getVerifyRes = await api.get('/verify-email?token=legacy-token-123');
  assert(getVerifyRes.status === 410, `GET /verify-email answered 410 (got ${getVerifyRes.status})`);
  const linkResetRes = await api.post('/reset-password', {
    token: 'legacy-token-123',
    password: 'NewPassword123!',
    confirm_password: 'NewPassword123!'
  });
  assert(linkResetRes.status === 410, `POST /reset-password with token answered 410 (got ${linkResetRes.status})`);

  console.log('\n--- Test 4: Unknown Email Gives Same Answer as Wrong Code ---');
  const unknownEmailRes = await api.post('/verify-email', {
    email: 'nonexistent_user@test.local',
    code: '123456'
  });
  assert(unknownEmailRes.status === 400, `Unknown email returned 400 (got ${unknownEmailRes.status})`);
  assert(unknownEmailRes.data.code === 'INVALID_CODE', 'Unknown email returns INVALID_CODE');
  assert(unknownEmailRes.data.attempts_left !== undefined, 'Unknown email returns attempts_left');

  console.log('\n--- Test 5: Wrong Code Reduces attempts_left ---');
  const wrongRes1 = await api.post('/verify-email', {
    email: testEmail1,
    code: '000000'
  });
  assert(wrongRes1.status === 400, `Wrong code 1 returned 400 (got ${wrongRes1.status})`);
  assert(wrongRes1.data.attempts_left === 4, `First wrong code leaves 4 attempts (got ${wrongRes1.data.attempts_left})`);

  const wrongRes2 = await api.post('/verify-email', {
    email: testEmail1,
    code: '000001'
  });
  assert(wrongRes2.data.attempts_left === 3, `Second wrong code leaves 3 attempts (got ${wrongRes2.data.attempts_left})`);

  console.log('\n--- Test 6: 5th Wrong Code Locks and Rejects Correct Code ---');
  await api.post('/verify-email', { email: testEmail1, code: '000002' }); // 3rd (2 left)
  await api.post('/verify-email', { email: testEmail1, code: '000003' }); // 4th (1 left)
  const lockRes = await api.post('/verify-email', { email: testEmail1, code: '000004' }); // 5th (locked!)
  assert(lockRes.status === 429, `5th wrong attempt returns 429 (got ${lockRes.status})`);
  assert(lockRes.data.code === 'TOO_MANY_ATTEMPTS', 'Lock returns TOO_MANY_ATTEMPTS code');

  // Even the correct code is now rejected because code is locked
  const tryCorrectAfterLock = await api.post('/verify-email', {
    email: testEmail1,
    code: issuedCode
  });
  assert(tryCorrectAfterLock.status === 429, 'Locked OTP rejects even the correct code with 429');

  console.log('\n--- Test 7: Resend Cooldown (60s) Enforced with 429 ---');
  const fastResendRes = await api.post('/resend-verification', { email: testEmail1 });
  assert(fastResendRes.status === 429, `Resend within 60s returns 429 (got ${fastResendRes.status})`);
  assert(fastResendRes.data.retry_after > 0, `retry_after is positive (${fastResendRes.data.retry_after}s)`);

  console.log('\n--- Test 8: New Code Invalidates the Old One ---');
  // Age the previous code past 60s cooldown in DB
  await pool.query(
    'UPDATE email_otp SET created_at = DATE_SUB(NOW(), INTERVAL 65 SECOND) WHERE user_id = ?',
    [regRes.data.user_id]
  );
  clearCapturedEmails();
  const allowResendRes = await api.post('/resend-verification', { email: testEmail1 });
  assert(allowResendRes.status === 200, 'Resend succeeds once cooldown has elapsed');
  const newCapturedMail = getLastCapturedEmail();
  const newCode = newCapturedMail.code;
  assert(newCode !== issuedCode, 'New code was generated');

  // Old code was invalidated/deleted
  const tryOldCode = await api.post('/verify-email', { email: testEmail1, code: issuedCode });
  assert(tryOldCode.status === 400 && tryOldCode.data.code === 'INVALID_CODE', 'Old code cannot verify');

  console.log('\n--- Test 9: Expired Code is Rejected ---');
  // Age the new code's expires_at into the past
  await pool.query(
    'UPDATE email_otp SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE user_id = ?',
    [regRes.data.user_id]
  );
  const expiredRes = await api.post('/verify-email', { email: testEmail1, code: newCode });
  assert(expiredRes.status === 400, `Expired code returns 400 (got ${expiredRes.status})`);
  assert(expiredRes.data.code === 'CODE_EXPIRED', `Expired code returns CODE_EXPIRED (got ${expiredRes.data.code})`);

  console.log('\n--- Test 10: Hourly Cap (5 codes/hr) Gives 429 ---');
  // Age all existing codes past the 60s cooldown (2 minutes ago)
  await pool.query(
    'UPDATE email_otp SET created_at = DATE_SUB(NOW(), INTERVAL 2 MINUTE) WHERE user_id = ?',
    [regRes.data.user_id]
  );
  // Insert 4 more codes so total in 1 hour is 5
  for (let i = 0; i < 4; i++) {
    await pool.query(
      `INSERT INTO email_otp (user_id, purpose, code_hash, expires_at, created_at)
       VALUES (?, 'VERIFY_EMAIL', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), DATE_SUB(NOW(), INTERVAL 2 MINUTE))`,
      [regRes.data.user_id, 'a'.repeat(64)]
    );
  }
  const hourlyCapRes = await api.post('/resend-verification', { email: testEmail1 });
  assert(hourlyCapRes.status === 429, `6th request in 1 hour returns 429 (got ${hourlyCapRes.status})`);
  assert(hourlyCapRes.data.code === 'HOURLY_LIMIT_EXCEEDED', `Returns HOURLY_LIMIT_EXCEEDED (got ${hourlyCapRes.data.code})`);

  console.log('\n--- Test 11: Correct Code Verifies and Signs In User ---');
  const testEmail2 = `otp_test_${Date.now()}_2@test.local`;
  clearCapturedEmails();
  const regRes2 = await api.post('/register', {
    role: 'PLAYER',
    email: testEmail2,
    username: `otp_u2_${Date.now().toString().slice(-6)}`,
    password: 'Password123!',
    confirm_password: 'Password123!',
    full_name: 'OTP Test Player 2',
    date_of_birth: '1998-08-20',
    gender: 'FEMALE',
    experience_level: 'ADVANCED',
    country: 'Canada',
    accept_terms: true
  });
  const validCode = getLastCapturedEmail().code;

  // Unverified login should return 403 EMAIL_NOT_VERIFIED with email
  const unverifiedLogin = await api.post('/login', {
    identifier: testEmail2,
    password: 'Password123!'
  });
  assert(unverifiedLogin.status === 403, 'Login before verification returns 403');
  assert(unverifiedLogin.data.code === 'EMAIL_NOT_VERIFIED', 'Returns code EMAIL_NOT_VERIFIED');
  assert(unverifiedLogin.data.email === testEmail2, 'Returns email in 403 payload');

  const verifySuccess = await api.post('/verify-email', {
    email: testEmail2,
    code: validCode
  });
  assert(verifySuccess.status === 200, `Verification returned 200 (got ${verifySuccess.status})`);
  assert(verifySuccess.data.token && typeof verifySuccess.data.token === 'string', 'Returns JWT auth token');
  assert(verifySuccess.data.user.email_verified === 1, 'user.email_verified is 1');
  assert(verifySuccess.data.user.status === 'ACTIVE', 'user.status is ACTIVE');

  console.log('\n--- Test 12: Used Code Cannot be Reused ---');
  const reuseRes = await api.post('/verify-email', {
    email: testEmail2,
    code: validCode
  });
  assert(reuseRes.status === 400, `Reusing code returns 400 (got ${reuseRes.status})`);
  assert(reuseRes.data.code === 'INVALID_CODE', 'Reused code treated as INVALID_CODE');

  console.log('\n--- Test 13: Password Reset by Code ---');
  clearCapturedEmails();
  const forgotRes = await api.post('/forgot-password', { email: testEmail2 });
  assert(forgotRes.status === 200, `Forgot password returned 200 (got ${forgotRes.status})`);
  const resetCode = getLastCapturedEmail().code;
  assert(resetCode && /^\d{6}$/.test(resetCode), 'Reset code captured from email');

  // Attempt reset with wrong code
  const wrongReset = await api.post('/reset-password', {
    email: testEmail2,
    code: '999999',
    password: 'NewStrongPassword123!',
    confirm_password: 'NewStrongPassword123!'
  });
  assert(wrongReset.status === 400 && wrongReset.data.code === 'INVALID_CODE', 'Wrong reset code rejected');

  // Attempt reset with correct code
  const goodReset = await api.post('/reset-password', {
    email: testEmail2,
    code: resetCode,
    password: 'NewStrongPassword123!',
    confirm_password: 'NewStrongPassword123!'
  });
  assert(goodReset.status === 200, `Password reset succeeded with 200 (got ${goodReset.status})`);

  // Old password no longer works
  const oldLogin = await api.post('/login', {
    identifier: testEmail2,
    password: 'Password123!'
  });
  assert(oldLogin.status === 401, 'Old password rejected with 401');

  // New password works
  const newLogin = await api.post('/login', {
    identifier: testEmail2,
    password: 'NewStrongPassword123!'
  });
  assert(newLogin.status === 200, 'New password logs in successfully with 200');

  console.log('\n--- Test 14: Console Mode Refused in Production ---');
  let prodRefused = false;
  try {
    const origTransport = env.MAIL_TRANSPORT;
    const origEnv = env.NODE_ENV;
    env.MAIL_TRANSPORT = 'console';
    env.NODE_ENV = 'production';
    try {
      await sendVerificationOtpEmail('prod@test.local', '123456');
    } finally {
      env.MAIL_TRANSPORT = origTransport;
      env.NODE_ENV = origEnv;
    }
  } catch (err) {
    if (err.message.includes('not allowed in production') || err.message.includes('refused in production')) {
      prodRefused = true;
    }
  }
  assert(prodRefused, 'Console mail transport is strictly refused when NODE_ENV=production');

  console.log('\n--- All 14 Test Scenarios PASSED! ---');
} finally {
  console.log('\n--- Cleaning up all test records (*@test.local) ---');
  await cleanupTestRecords();
  server.close();

  // Verify row counts are back to what they were
  const [afterUsers] = await pool.query('SELECT COUNT(*) AS cnt FROM app_user');
  const [afterOtps] = await pool.query('SELECT COUNT(*) AS cnt FROM email_otp');
  const [afterAudits] = await pool.query('SELECT COUNT(*) AS cnt FROM audit_log');
  const afterCounts = {
    users: afterUsers[0].cnt,
    otps: afterOtps[0].cnt,
    audits: afterAudits[0].cnt
  };
  console.log('Final counts after test cleanup:', afterCounts);
  console.log('Expected baseline counts:       ', baseline);

  assert(afterCounts.users === baseline.users, `app_user count restored to ${baseline.users}`);
  assert(afterCounts.otps === baseline.otps, `email_otp count restored to ${baseline.otps}`);
  assert(afterCounts.audits === baseline.audits, `audit_log count restored to ${baseline.audits}`);

  await pool.end();
}
