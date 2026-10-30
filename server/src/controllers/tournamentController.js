import { z } from 'zod';
import { pool } from '../config/db.js';
import { checkTournamentOwnership } from '../middleware/authMiddleware.js';

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  format: z.enum(['ROUND_ROBIN', 'KNOCKOUT', 'SWISS'], {
    errorMap: () => ({ message: 'Format must be ROUND_ROBIN, KNOCKOUT, or SWISS' })
  }),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be in YYYY-MM-DD format'),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED']).optional().default('UPCOMING')
}).refine(data => data.end_date >= data.start_date, {
  message: 'end_date must be greater than or equal to start_date',
  path: ['end_date']
});

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  format: z.enum(['ROUND_ROBIN', 'KNOCKOUT', 'SWISS']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
}).refine(data => {
  if (data.start_date && data.end_date) {
    return data.end_date >= data.start_date;
  }
  return true;
}, {
  message: 'end_date must be greater than or equal to start_date',
  path: ['end_date']
});

export const registerPlayerSchema = z.object({
  player_id: z.number().int().positive('player_id must be a positive integer')
});

export const getTournaments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              COUNT(DISTINCT r.player_id) AS player_count,
              COUNT(DISTINCT tr.round_id) AS rounds_count
       FROM tournament t
       LEFT JOIN registration r ON r.tournament_id = t.tournament_id
       LEFT JOIN tournament_round tr ON tr.tournament_id = t.tournament_id
       GROUP BY t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by
       ORDER BY t.start_date DESC, t.tournament_id DESC`
    );
    const formatted = rows.map(r => ({
      ...r,
      player_count: Number(r.player_count),
      rounds_count: Number(r.rounds_count)
    }));
    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

export const getTournamentById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              COUNT(DISTINCT r.player_id) AS player_count,
              COUNT(DISTINCT tr.round_id) AS rounds_count
       FROM tournament t
       LEFT JOIN registration r ON r.tournament_id = t.tournament_id
       LEFT JOIN tournament_round tr ON tr.tournament_id = t.tournament_id
       WHERE t.tournament_id = ?
       GROUP BY t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const item = {
      ...rows[0],
      player_count: Number(rows[0].player_count),
      rounds_count: Number(rows[0].rounds_count)
    };
    return res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createTournament = async (req, res, next) => {
  const { name, format, start_date, end_date, status = 'UPCOMING' } = req.body;
  const createdBy = req.user.user_id;

  try {
    const [result] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, format, start_date, end_date, status, createdBy]
    );

    const [rows] = await pool.query(
      'SELECT tournament_id, name, format, start_date, end_date, status, created_by FROM tournament WHERE tournament_id = ?',
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateTournament = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const isOwner = await checkTournamentOwnership(req, res, id);
    if (!isOwner) return;

    const allowedColumns = ['name', 'format', 'start_date', 'end_date', 'status'];
    const fields = [];
    const values = [];

    for (const key of allowedColumns) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    values.push(id);
    await pool.query(
      `UPDATE tournament SET ${fields.join(', ')} WHERE tournament_id = ?`,
      values
    );

    const [rows] = await pool.query(
      'SELECT tournament_id, name, format, start_date, end_date, status, created_by FROM tournament WHERE tournament_id = ?',
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const registerPlayer = async (req, res, next) => {
  const { id: tournamentId } = req.params;
  const { player_id } = req.body;

  try {
    const isOwner = await checkTournamentOwnership(req, res, tournamentId);
    if (!isOwner) return;

    const [result] = await pool.query(
      'INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)',
      [tournamentId, player_id]
    );

    const [rows] = await pool.query(
      `SELECT r.registration_id, r.tournament_id, r.player_id, r.rating_at_entry, r.registered_at,
              p.name AS player_name, p.country, p.current_rating
       FROM registration r
       JOIN player p ON p.player_id = r.player_id
       WHERE r.registration_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Player registered successfully',
      registration: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const registerMe = async (req, res, next) => {
  const { id: tournamentId } = req.params;
  const playerId = req.user.player_id;

  if (!playerId) {
    return res.status(400).json({
      error: 'No player profile associated with your user account'
    });
  }

  try {
    const [tRows] = await pool.query(
      'SELECT tournament_id, status FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tRows[0].status !== 'UPCOMING') {
      return res.status(400).json({
        error: 'Registration is only open for UPCOMING tournaments'
      });
    }

    // Check if already registered
    const [existing] = await pool.query(
      'SELECT registration_id FROM registration WHERE tournament_id = ? AND player_id = ?',
      [tournamentId, playerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Player is already registered for this tournament'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)',
      [tournamentId, playerId]
    );

    const [rows] = await pool.query(
      `SELECT r.registration_id, r.tournament_id, r.player_id, r.rating_at_entry, r.registered_at,
              p.name AS player_name, p.country, p.current_rating
       FROM registration r
       JOIN player p ON p.player_id = r.player_id
       WHERE r.registration_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Player registered successfully',
      registration: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const getRegistrations = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  try {
    const [tournamentRows] = await pool.query(
      'SELECT tournament_id FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournamentRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const [rows] = await pool.query(
      `SELECT r.registration_id, r.tournament_id, r.player_id, r.rating_at_entry, r.registered_at,
              p.name AS player_name, p.country, p.current_rating
       FROM registration r
       JOIN player p ON p.player_id = r.player_id
       WHERE r.tournament_id = ?
       ORDER BY r.registered_at ASC`,
      [tournamentId]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createRound = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  try {
    const isOwner = await checkTournamentOwnership(req, res, tournamentId);
    if (!isOwner) return;

    // Auto-calculate next round number
    const [roundMax] = await pool.query(
      'SELECT COALESCE(MAX(round_no), 0) + 1 AS next_round_no FROM tournament_round WHERE tournament_id = ?',
      [tournamentId]
    );
    const nextRoundNo = roundMax[0].next_round_no;

    const [insertResult] = await pool.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [tournamentId, nextRoundNo, 'SCHEDULED']
    );

    const [rows] = await pool.query(
      'SELECT round_id, tournament_id, round_no, status FROM tournament_round WHERE round_id = ?',
      [insertResult.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const getRounds = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  try {
    const [tournamentRows] = await pool.query(
      'SELECT tournament_id FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournamentRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const [rows] = await pool.query(
      'SELECT round_id, tournament_id, round_no, status FROM tournament_round WHERE tournament_id = ? ORDER BY round_no ASC',
      [tournamentId]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const getStandings = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  try {
    const [tournamentRows] = await pool.query(
      'SELECT tournament_id FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournamentRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const [rows] = await pool.query(
      `SELECT tournament_id, rank_no, player_id, name, current_rating, played, wins, draws, losses, points
       FROM v_leaderboard
       WHERE tournament_id = ?
       ORDER BY rank_no ASC`,
      [tournamentId]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const getTournamentAnalytics = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  try {
    const [tournamentRows] = await pool.query(
      'SELECT tournament_id, name, format, start_date, end_date, status FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournamentRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // 1. Total games and win/draw counts by outcome
    const [gameStats] = await pool.query(
      `SELECT
         COUNT(g.game_id) AS total_games_scheduled,
         COUNT(r.game_id) AS total_games_played,
         COALESCE(SUM(r.outcome = 'WHITE'), 0) AS white_wins,
         COALESCE(SUM(r.outcome = 'BLACK'), 0) AS black_wins,
         COALESCE(SUM(r.outcome = 'DRAW'), 0)  AS draws
       FROM game g
       JOIN tournament_round tr ON tr.round_id = g.round_id
       LEFT JOIN result r ON r.game_id = g.game_id
       WHERE tr.tournament_id = ?`,
      [tournamentId]
    );

    const stats = gameStats[0] || {
      total_games_scheduled: 0,
      total_games_played: 0,
      white_wins: 0,
      black_wins: 0,
      draws: 0
    };

    // 2. Upsets from v_upsets for this tournament
    const [upsetRows] = await pool.query(
      'SELECT tournament_id, game_id, winner, winner_rating, loser, loser_rating, rating_gap FROM v_upsets WHERE tournament_id = ? ORDER BY game_id ASC',
      [tournamentId]
    );

    // 3. Rating changes per player in this tournament
    const [ratingChangeRows] = await pool.query(
      `SELECT
         p.player_id,
         p.name,
         p.current_rating,
         COALESCE(SUM(rh.rating_change), 0) AS total_rating_change,
         COUNT(rh.game_id) AS games_rated
       FROM registration reg
       JOIN player p ON p.player_id = reg.player_id
       LEFT JOIN (
         rating_history rh
         JOIN game g ON g.game_id = rh.game_id
         JOIN tournament_round tr ON tr.round_id = g.round_id AND tr.tournament_id = ?
       ) ON rh.player_id = reg.player_id
       WHERE reg.tournament_id = ?
       GROUP BY p.player_id, p.name, p.current_rating
       ORDER BY total_rating_change DESC`,
      [tournamentId, tournamentId]
    );

    return res.json({
      tournament: tournamentRows[0],
      total_games: Number(stats.total_games_scheduled),
      games_played: Number(stats.total_games_played),
      outcome_counts: {
        white_wins: Number(stats.white_wins),
        black_wins: Number(stats.black_wins),
        draws: Number(stats.draws)
      },
      upsets: upsetRows,
      rating_changes: ratingChangeRows
    });
  } catch (err) {
    next(err);
  }
};

export const getTournamentPredictions = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  try {
    const [tournamentRows] = await pool.query(
      'SELECT tournament_id FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournamentRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const [rows] = await pool.query(
      `SELECT pr.player_id, p.name, p.current_rating, pr.predicted_score, pr.model_version, pr.created_at
       FROM prediction pr
       JOIN player p ON p.player_id = pr.player_id
       WHERE pr.tournament_id = ?
       ORDER BY pr.predicted_score DESC`,
      [tournamentId]
    );

    const formattedRows = rows.map((row) => ({
      player_id: row.player_id,
      name: row.name,
      current_rating: row.current_rating,
      predicted_score: Number(row.predicted_score),
      model_version: row.model_version,
      created_at: row.created_at
    }));

    return res.json(formattedRows);
  } catch (err) {
    next(err);
  }
};

export default {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  registerPlayer,
  registerMe,
  getRegistrations,
  createRound,
  getRounds,
  getStandings,
  getTournamentAnalytics,
  getTournamentPredictions,
  createTournamentSchema,
  updateTournamentSchema,
  registerPlayerSchema
};
