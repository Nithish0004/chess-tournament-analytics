process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'console';

import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';

const PORT = 5057;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runVerification = async () => {
  console.log('======================================================================');
  console.log('--- Testing Redesigned Login & Registration Requirements Suite ---');
  console.log('======================================================================\n');

  const app = createApp();
  const server = app.listen(PORT);

  const RUN_ID = Date.now();
  let passedCount = 0;
  let totalCount = 0;

  const test = (name, condition, details = '') => {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✅ PASS - ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`❌ FAIL - ${name} ${details ? `-> ${details}` : ''}`);
    }
  };

  try {
    // 1. Username Availability Check
    console.log('1. Real-time Username Availability Checks');
    const testUsername = `user_${RUN_ID.toString().slice(-8)}`;
    const uAvailRes = await fetch(`${BASE_URL}/api/auth/check-username?username=${testUsername}`);
    const uAvailJson = await uAvailRes.json();
    test('Check unused username returns available: true', uAvailJson.available === true);

    const uInvalidRes = await fetch(`${BASE_URL}/api/auth/check-username?username=ab`);
    const uInvalidJson = await uInvalidRes.json();
    test('Check short username returns available: false with helpful error', uInvalidJson.available === false && uInvalidJson.error);

    // 2. Email Availability Check
    console.log('\n2. Real-time Email Availability Checks');
    const eAvailRes = await fetch(`${BASE_URL}/api/auth/check-email?email=new_player_${RUN_ID}@example.com`);
    const eAvailJson = await eAvailRes.json();
    test('Check unused email returns available: true', eAvailJson.available === true);

    // 3. Successful Player Registration
    console.log('\n3. Player Registration with Full Name, Username, Email, Password, Country');
    const regUsername = `player_${RUN_ID.toString().slice(-8)}`;
    const regEmail = `player_${RUN_ID}@chessmagic.test`;
    const regPass = 'StrongPass123!';

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Magnus Testson',
        username: regUsername,
        email: regEmail,
        password: regPass,
        confirm_password: regPass,
        country: 'India',
        country_code: 'IN',
        date_of_birth: '1995-05-15',
        gender: 'MALE',
        experience_level: 'ADVANCED',
        accept_terms: true
      })
    });
    const regJson = await regRes.json();
    test('Registering a player successfully returns 200 or 201', regRes.status === 200 || regRes.status === 201, `Status: ${regRes.status}`);

    // Verify app_user and player records in DB
    const [userRows] = await pool.query(
      'SELECT user_id, email, username, role, country_code, player_id FROM app_user WHERE email = ?',
      [regEmail]
    );
    test('User saved in DB with correct username, role=PLAYER, country_code=IN',
      userRows.length > 0 &&
      userRows[0].username === regUsername &&
      userRows[0].role === 'PLAYER' &&
      userRows[0].country_code === 'IN'
    );

    const [playerRows] = await pool.query(
      'SELECT player_id, name, country, country_code, current_rating FROM player WHERE player_id = ?',
      [userRows[0]?.player_id]
    );
    test('Linked player record created with name, country, country_code, starting rating=1200',
      playerRows.length > 0 &&
      playerRows[0].country === 'India' &&
      playerRows[0].country_code === 'IN' &&
      playerRows[0].current_rating === 1200
    );

    // 4. Duplicate Email Handling
    console.log('\n4. Duplicate Email Handling');
    const dupEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Another Player',
        username: `diff_user_${RUN_ID.toString().slice(-6)}`,
        email: regEmail, // same email
        password: regPass,
        confirm_password: regPass,
        country: 'Norway',
        country_code: 'NO',
        date_of_birth: '1992-01-01',
        gender: 'MALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const dupEmailJson = await dupEmailRes.json();
    test('Registering with an already-used email rejected with 409 Conflict', dupEmailRes.status === 409, dupEmailJson.error);

    // 5. Duplicate Email with Different Letter Casing
    console.log('\n5. Email Case-Insensitive Uniqueness');
    const upperEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Casing Player',
        username: `casing_user_${RUN_ID.toString().slice(-6)}`,
        email: regEmail.toUpperCase(), // UPPER CASE EMAIL
        password: regPass,
        confirm_password: regPass,
        country: 'France',
        country_code: 'FR',
        date_of_birth: '1992-01-01',
        gender: 'FEMALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    test('Registering with different letter casing of existing email rejected with 409', upperEmailRes.status === 409);

    // 6. Duplicate Username Handling
    console.log('\n6. Duplicate Username Handling');
    const dupUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Third Player',
        username: regUsername, // same username
        email: `another_email_${RUN_ID}@example.com`,
        password: regPass,
        confirm_password: regPass,
        country: 'United States',
        country_code: 'US',
        date_of_birth: '1994-01-01',
        gender: 'MALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const dupUserJson = await dupUserRes.json();
    test('Registering with an already-used username rejected with 409 Conflict', dupUserRes.status === 409, dupUserJson.error);

    // 7. Duplicate Username with Different Letter Casing
    console.log('\n7. Username Case-Insensitive Uniqueness');
    const upperUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Fourth Player',
        username: regUsername.toUpperCase(), // UPPER CASE USERNAME
        email: `fourth_email_${RUN_ID}@example.com`,
        password: regPass,
        confirm_password: regPass,
        country: 'Germany',
        country_code: 'DE',
        date_of_birth: '1994-01-01',
        gender: 'OTHER',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    test('Registering with different letter casing of existing username rejected with 409', upperUserRes.status === 409);

    // 8. Concurrent Duplicate Registration Attempts
    console.log('\n8. Concurrent Registration Race Condition Safety');
    const raceUsername = `race_${RUN_ID.toString().slice(-8)}`;
    const raceEmail = `race_${RUN_ID}@chessmagic.test`;

    const makeReq = () => fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Race Player',
        username: raceUsername,
        email: raceEmail,
        password: regPass,
        confirm_password: regPass,
        country: 'India',
        country_code: 'IN',
        date_of_birth: '1997-01-01',
        gender: 'MALE',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });

    const [raceRes1, raceRes2] = await Promise.all([makeReq(), makeReq()]);
    const statuses = [raceRes1.status, raceRes2.status].sort();
    test('Concurrent duplicate registration safely handles conflict (one success, one 409)',
      (statuses[0] === 200 || statuses[0] === 201) && statuses[1] === 409,
      `Responses: ${statuses[0]} and ${statuses[1]}`
    );

    // 9. Login using Email & Username
    console.log('\n9. Authentication via Email & Username');

    // Activate test account in database for login
    await pool.query(
      "UPDATE app_user SET email_verified = 1, status = 'ACTIVE' WHERE email = ?",
      [regEmail]
    );

    // Login via Email
    const loginByEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        password: regPass
      })
    });
    const loginByEmailJson = await loginByEmailRes.json();
    test('Login via email returns 200, JWT token, and user details',
      loginByEmailRes.status === 200 &&
      !!loginByEmailJson.token &&
      loginByEmailJson.user?.email === regEmail &&
      loginByEmailJson.user?.username === regUsername
    );

    // Login via Username
    const loginByUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: regUsername,
        password: regPass
      })
    });
    const loginByUserJson = await loginByUserRes.json();
    test('Login via username returns 200, JWT token, and user details',
      loginByUserRes.status === 200 &&
      !!loginByUserJson.token &&
      loginByUserJson.user?.username === regUsername
    );

    // 10. Incorrect Password Handling
    console.log('\n10. Incorrect Password Handling');
    const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: regUsername,
        password: 'CompletelyWrongPassword123!'
      })
    });
    test('Incorrect password rejected with 401', badPassRes.status === 401);

    // 11. Existing Organizer and Admin Login
    console.log('\n11. Existing Organizer & Admin Login Verification');

    const DEMO_PASS = 'DemoPass123!';
    const bcryptHash = await (await import('bcrypt')).hash(DEMO_PASS, 12);

    await pool.query(
      `UPDATE app_user
       SET username = 'org_approved', password_hash = ?, status = 'ACTIVE', approval_status = 'APPROVED', email_verified = 1
       WHERE email = 'organizer.approved@chess.demo'`,
      [bcryptHash]
    );

    await pool.query(
      `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified)
       VALUES ('admin@chess.demo', 'super_admin', ?, 'Chief Administrator', 'ADMIN', 'ACTIVE', 'APPROVED', 1)
       ON DUPLICATE KEY UPDATE username = 'super_admin', password_hash = VALUES(password_hash), status = 'ACTIVE', approval_status = 'APPROVED'`,
      [bcryptHash]
    );

    // Organizer login via username
    const orgLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'org_approved',
        password: DEMO_PASS
      })
    });
    const orgLoginJson = await orgLoginRes.json();
    test('Existing Organizer logs in via username with ORGANIZER role & permissions',
      orgLoginRes.status === 200 &&
      orgLoginJson.user?.role === 'ORGANIZER' &&
      orgLoginJson.permissions?.can_create_tournaments === true
    );

    // Admin login via email
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@chess.demo',
        password: DEMO_PASS
      })
    });
    const adminLoginJson = await adminLoginRes.json();
    test('Existing Admin logs in via email with ADMIN role & permissions',
      adminLoginRes.status === 200 &&
      adminLoginJson.user?.role === 'ADMIN' &&
      adminLoginJson.permissions?.can_access_admin === true
    );

    // Clean up test accounts
    await pool.query('DELETE FROM app_user WHERE email LIKE ? OR username LIKE ?', [`%${RUN_ID}%`, `%${RUN_ID}%`]);
    await pool.query('DELETE FROM player WHERE email LIKE ?', [`%${RUN_ID}%`]);

    console.log('\n======================================================================');
    console.log(`Results: ${passedCount}/${totalCount} tests passed.`);
    console.log('======================================================================');

    server.close();
    await pool.end();
    process.exit(passedCount === totalCount ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    server.close();
    await pool.end();
    process.exit(1);
  }
};

runVerification();
