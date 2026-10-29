import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runTests = async () => {
  console.log('--- Starting Comprehensive API Endpoint Verification ---');
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Test server running at ${BASE_URL}`);
  });

  let token = '';
  let testPlayerId = null;
  let testTournamentId = null;
  let testRoundId = null;
  let testGameId = null;
  let player2Id = null;

  const results = [];

  const record = (name, passed, details = '') => {
    results.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} - ${name} ${details ? '(' + details + ')' : ''}`);
  };

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    record('GET /health', healthRes.status === 200 && healthJson.status === 'ok');

    // 2. Auth: POST /api/auth/login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const loginJson = await loginRes.json();
    token = loginJson.token;
    record('POST /api/auth/login (valid credentials)', loginRes.status === 200 && !!token);

    // 2b. Auth: POST /api/auth/login with invalid password
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    record('POST /api/auth/login (invalid credentials returns 401)', badLoginRes.status === 401);

    // 3. GET /api/players
    const getPlayersRes = await fetch(`${BASE_URL}/api/players`);
    const playersList = await getPlayersRes.json();
    record('GET /api/players (public)', getPlayersRes.status === 200 && Array.isArray(playersList) && playersList.length > 0, `found ${playersList.length}`);

    // 4. GET /api/players?q=Magnus
    const searchRes = await fetch(`${BASE_URL}/api/players?q=Magnus`);
    const searchList = await searchRes.json();
    record('GET /api/players?q=Magnus', searchRes.status === 200 && searchList.some(p => p.name.includes('Magnus')));

    // 5. POST /api/players (without auth -> should 401)
    const unauthPostPlayer = await fetch(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauth Player', email: 'unauth@test.com' })
    });
    record('POST /api/players (without JWT returns 401)', unauthPostPlayer.status === 401);

    // 6. POST /api/players (with auth)
    const createPlayerRes = await fetch(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Alexander Alekhine',
        email: `alekhine_${Date.now()}@test.com`,
        country: 'France',
        date_of_birth: '1892-10-31',
        current_rating: 2600
      })
    });
    const createdPlayer = await createPlayerRes.json();
    testPlayerId = createdPlayer.player_id;
    record('POST /api/players (with JWT returns 201)', createPlayerRes.status === 201 && !!testPlayerId, `id: ${testPlayerId}`);

    // Create a second player for tournament registration / games
    const createPlayer2Res = await fetch(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Jose Raul Capablanca',
        email: `capa_${Date.now()}@test.com`,
        country: 'Cuba',
        date_of_birth: '1888-11-19',
        current_rating: 2700
      })
    });
    const createdPlayer2 = await createPlayer2Res.json();
    player2Id = createdPlayer2.player_id;

    // 7. GET /api/players/:id
    const getPlayerRes = await fetch(`${BASE_URL}/api/players/${testPlayerId}`);
    const fetchedPlayer = await getPlayerRes.json();
    record('GET /api/players/:id', getPlayerRes.status === 200 && fetchedPlayer.name === 'Alexander Alekhine');

    // 8. PUT /api/players/:id
    const putPlayerRes = await fetch(`${BASE_URL}/api/players/${testPlayerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ country: 'Russia' })
    });
    const updatedPlayer = await putPlayerRes.json();
    record('PUT /api/players/:id (allowed fields)', putPlayerRes.status === 200 && updatedPlayer.country === 'Russia');

    // 8b. PUT /api/players/:id attempting to edit current_rating directly -> must 400 and NOT change rating
    const putRatingRes = await fetch(`${BASE_URL}/api/players/${testPlayerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ current_rating: 2999 })
    });
    const putRatingJson = await putRatingRes.json();

    // Verify rating in DB was NOT changed
    const verifyPlayerRes = await fetch(`${BASE_URL}/api/players/${testPlayerId}`);
    const verifyPlayer = await verifyPlayerRes.json();

    record('PUT /api/players/:id with current_rating rejected (returns 400 & unchanged rating)',
      putRatingRes.status === 400 &&
      putRatingJson.error === 'Rating cannot be edited directly' &&
      verifyPlayer.current_rating !== 2999,
      `status: ${putRatingRes.status}, rating stayed: ${verifyPlayer.current_rating}`
    );

    // 9. GET /api/players/:id/analytics
    // Let's test on player 1 (Magnus) who has demo games
    const player1AnalyticsRes = await fetch(`${BASE_URL}/api/players/1/analytics`);
    const player1Analytics = await player1AnalyticsRes.json();
    record('GET /api/players/:id/analytics',
      player1AnalyticsRes.status === 200 &&
      player1Analytics.player &&
      player1Analytics.performance &&
      Array.isArray(player1Analytics.rating_progression) &&
      Array.isArray(player1Analytics.tournament_history)
    );

    // 10. GET /api/tournaments
    const getTournamentsRes = await fetch(`${BASE_URL}/api/tournaments`);
    const tournamentsList = await getTournamentsRes.json();
    record('GET /api/tournaments', getTournamentsRes.status === 200 && Array.isArray(tournamentsList));

    // 11. POST /api/tournaments
    const createTourneyRes = await fetch(`${BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'World Championship Match 2026',
        format: 'ROUND_ROBIN',
        start_date: '2026-11-01',
        end_date: '2026-11-20',
        status: 'UPCOMING'
      })
    });
    const createdTourney = await createTourneyRes.json();
    testTournamentId = createdTourney.tournament_id;
    record('POST /api/tournaments', createTourneyRes.status === 201 && !!testTournamentId, `id: ${testTournamentId}`);

    // 12. GET /api/tournaments/:id
    const getTourneyRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}`);
    const fetchedTourney = await getTourneyRes.json();
    record('GET /api/tournaments/:id', getTourneyRes.status === 200 && fetchedTourney.name === 'World Championship Match 2026');

    // 13. PUT /api/tournaments/:id (change status)
    const putTourneyRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'ONGOING' })
    });
    const updatedTourney = await putTourneyRes.json();
    record('PUT /api/tournaments/:id (change status)', putTourneyRes.status === 200 && updatedTourney.status === 'ONGOING');

    // 14. POST /api/tournaments/:id/register
    const regRes1 = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ player_id: testPlayerId })
    });
    const reg1Json = await regRes1.json();
    record('POST /api/tournaments/:id/register (player 1)', regRes1.status === 201 && reg1Json.registration);

    const regRes2 = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ player_id: player2Id })
    });
    record('POST /api/tournaments/:id/register (player 2)', regRes2.status === 201);

    // 15. GET /api/tournaments/:id/registrations
    const getRegsRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/registrations`);
    const regsList = await getRegsRes.json();
    record('GET /api/tournaments/:id/registrations', getRegsRes.status === 200 && regsList.length === 2);

    // 16. POST /api/tournaments/:id/rounds (auto round_no)
    const createRoundRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/rounds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const createdRound = await createRoundRes.json();
    testRoundId = createdRound.round_id;
    record('POST /api/tournaments/:id/rounds (round_no auto = 1)', createRoundRes.status === 201 && createdRound.round_no === 1, `round_id: ${testRoundId}`);

    // Create Round 2 to verify auto-increment of round_no
    const createRound2Res = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/rounds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const createdRound2 = await createRound2Res.json();
    record('POST /api/tournaments/:id/rounds (round_no auto = 2)', createRound2Res.status === 201 && createdRound2.round_no === 2);

    // 17. GET /api/tournaments/:id/rounds
    const getRoundsRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/rounds`);
    const roundsList = await getRoundsRes.json();
    record('GET /api/tournaments/:id/rounds', getRoundsRes.status === 200 && roundsList.length === 2);

    // 18. POST /api/rounds/:id/games
    const createGameRes = await fetch(`${BASE_URL}/api/rounds/${testRoundId}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        board_no: 1,
        white_player_id: testPlayerId,
        black_player_id: player2Id
      })
    });
    const createdGame = await createGameRes.json();
    testGameId = createdGame.game_id;
    record('POST /api/rounds/:id/games', createGameRes.status === 201 && !!testGameId, `game_id: ${testGameId}`);

    // 19. GET /api/rounds/:id/games
    const getGamesRes = await fetch(`${BASE_URL}/api/rounds/${testRoundId}/games`);
    const gamesList = await getGamesRes.json();
    record('GET /api/rounds/:id/games', getGamesRes.status === 200 && gamesList.length === 1);

    // 20. POST /api/games/:id/result
    const recordResultRes = await fetch(`${BASE_URL}/api/games/${testGameId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ outcome: 'WHITE' })
    });
    const resultJson = await recordResultRes.json();
    record('POST /api/games/:id/result (calls record_result)', recordResultRes.status === 200 && resultJson.result && resultJson.result.outcome === 'WHITE');

    // 21. GET /api/tournaments/:id/standings
    const getStandingsRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/standings`);
    const standingsList = await getStandingsRes.json();
    record('GET /api/tournaments/:id/standings', getStandingsRes.status === 200 && standingsList.length === 2, `leader: ${standingsList[0]?.name}`);

    // 22. GET /api/tournaments/:id/analytics
    const getTourneyAnalyticsRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/analytics`);
    const tourneyAnalytics = await getTourneyAnalyticsRes.json();
    record('GET /api/tournaments/:id/analytics',
      getTourneyAnalyticsRes.status === 200 &&
      tourneyAnalytics.total_games === 1 &&
      tourneyAnalytics.outcome_counts &&
      Array.isArray(tourneyAnalytics.upsets) &&
      Array.isArray(tourneyAnalytics.rating_changes)
    );

    // 22b. GET /api/tournaments/:id/predictions
    const getPredsRes = await fetch(`${BASE_URL}/api/tournaments/1/predictions`);
    const predsList = await getPredsRes.json();
    const isSortedDesc = predsList.every((val, i, arr) => !i || arr[i - 1].predicted_score >= val.predicted_score);
    const hasRequiredFields = predsList.length > 0 && predsList.every(p =>
      p.player_id !== undefined &&
      typeof p.name === 'string' &&
      typeof p.current_rating === 'number' &&
      typeof p.predicted_score === 'number' &&
      typeof p.model_version === 'string' &&
      p.created_at !== undefined
    );

    record('GET /api/tournaments/:id/predictions (public, ordered by predicted_score DESC)',
      getPredsRes.status === 200 && Array.isArray(predsList) && isSortedDesc && hasRequiredFields,
      `found ${predsList.length} predictions, top score: ${predsList[0]?.predicted_score} by ${predsList[0]?.name}`
    );

    // 22c. GET /api/tournaments/999999/predictions (non-existent tournament returns 404)
    const getMissingPredsRes = await fetch(`${BASE_URL}/api/tournaments/999999/predictions`);
    record('GET /api/tournaments/:id/predictions (not found returns 404)', getMissingPredsRes.status === 404);

    // 23. GET /api/dashboard
    const getDashboardRes = await fetch(`${BASE_URL}/api/dashboard`);
    const dashboardJson = await getDashboardRes.json();
    record('GET /api/dashboard',
      getDashboardRes.status === 200 &&
      Array.isArray(dashboardJson.top_players) &&
      dashboardJson.outcome_distribution &&
      typeof dashboardJson.total_upsets === 'number' &&
      Array.isArray(dashboardJson.recent_upsets) &&
      Array.isArray(dashboardJson.rating_progression_top5)
    );

    // --- Error Mapping Verification ---
    console.log('\n--- Error Mapping Verification ---');

    // MySQL 1062: Duplicate entry (e.g. duplicate registration) -> 409 with generic message
    const dupRegRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ player_id: testPlayerId })
    });
    const dupRegJson = await dupRegRes.json();
    record('MySQL 1062 -> 409 with generic "Duplicate entry" message',
      dupRegRes.status === 409 &&
      dupRegJson.message === 'Duplicate entry' &&
      !dupRegJson.message.includes('for key')
    );

    // MySQL 1452: Foreign key fails -> 409 with generic message
    const fkRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ player_id: 999999 })
    });
    const fkResJson = await fkRes.json();
    record('MySQL 1452 -> 409 with generic "Referenced record does not exist" message',
      fkRes.status === 409 &&
      fkResJson.message === 'Referenced record does not exist' &&
      !fkResJson.message.includes('foreign key constraint fails')
    );

    // MySQL 3819: Check constraint violated -> 400
    const checkRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ end_date: '2020-01-01' })
    });
    const checkJson = await checkRes.json();
    record('MySQL 3819 -> 400 (Check constraint violated)', checkRes.status === 400 && checkJson.error.includes('Check constraint'));

    // If we test 1644: SIGNAL from procedures/triggers -> 400 with message
    const dupResultRes = await fetch(`${BASE_URL}/api/games/${testGameId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ outcome: 'BLACK' })
    });
    const dupResultJson = await dupResultRes.json();
    record('MySQL 1644 -> 400 with custom signal message',
      dupResultRes.status === 400 && dupResultJson.error.includes('Result already recorded')
    );

    // Zod validation error -> 400
    const zodRes = await fetch(`${BASE_URL}/api/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: '', email: 'not-an-email' })
    });
    record('Zod validation failure -> 400', zodRes.status === 400);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close(async () => {
      await pool.end();
      const failed = results.filter(r => !r.passed);
      console.log(`\n========================================`);
      console.log(`Summary: ${results.length - failed.length}/${results.length} tests passed.`);
      if (failed.length > 0) {
        console.error(`Failed tests:`, failed);
        process.exit(1);
      } else {
        console.log(`ALL ENDPOINTS AND ERROR HANDLERS VERIFIED!`);
        process.exit(0);
      }
    });
  }
};

runTests();
