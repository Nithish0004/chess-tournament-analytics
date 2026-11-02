import { z } from 'zod';
import { pool } from '../config/db.js';
import { checkTournamentOwnership } from '../middleware/authMiddleware.js';
import { logAudit } from '../utils/auditLogger.js';

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  format: z.enum(['ROUND_ROBIN', 'KNOCKOUT', 'SWISS'], {
    errorMap: () => ({ message: 'Format must be ROUND_ROBIN, KNOCKOUT, or SWISS' })
  }),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be in YYYY-MM-DD format'),
  max_players: z.number().int().min(2, 'max_players must be at least 2').optional().nullable(),
  registration_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'registration_deadline must be in YYYY-MM-DD format').optional().nullable(),
  rounds_planned: z.number().int().min(1, 'rounds_planned must be at least 1').optional().nullable(),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED']).optional().default('UPCOMING')
}).refine(data => data.end_date >= data.start_date, {
  message: 'end_date must be greater than or equal to start_date',
  path: ['end_date']
}).refine(data => {
  if (data.registration_deadline && data.start_date) {
    return data.registration_deadline <= data.start_date;
  }
  return true;
}, {
  message: 'registration_deadline must be less than or equal to start_date',
  path: ['registration_deadline']
});

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  format: z.enum(['ROUND_ROBIN', 'KNOCKOUT', 'SWISS']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  max_players: z.number().int().min(2, 'max_players must be at least 2').optional().nullable(),
  registration_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'registration_deadline must be in YYYY-MM-DD format').optional().nullable(),
  rounds_planned: z.number().int().min(1, 'rounds_planned must be at least 1').optional().nullable()
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
}).refine(data => {
  if (data.registration_deadline && data.start_date) {
    return data.registration_deadline <= data.start_date;
  }
  return true;
}, {
  message: 'registration_deadline must be less than or equal to start_date',
  path: ['registration_deadline']
});

export const registerPlayerSchema = z.object({
  player_id: z.number().int().positive('player_id must be a positive integer')
});

export const computeCanManageTournament = (user, tournament) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'PLAYER') return false;
  if (user.role === 'ORGANIZER') {
    if (tournament.status === 'COMPLETED') return false;
    return tournament.created_by != null && Number(tournament.created_by) === Number(user.user_id);
  }
  return false;
};

export const getTournaments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              t.max_players, t.registration_deadline, t.rounds_planned,
              u.full_name AS owner_name,
              COALESCE(p.registered, 0) AS registered,
              COALESCE(p.rounds_created, 0) AS rounds_created,
              COALESCE(p.games_total, 0) AS games_total,
              COALESCE(p.games_finished, 0) AS games_finished
       FROM tournament t
       LEFT JOIN app_user u ON u.user_id = t.created_by
       LEFT JOIN v_tournament_progress p ON p.tournament_id = t.tournament_id
       ORDER BY t.start_date DESC, t.tournament_id DESC`
    );
    const formatted = rows.map(r => ({
      ...r,
      max_players: r.max_players != null ? Number(r.max_players) : null,
      rounds_planned: r.rounds_planned != null ? Number(r.rounds_planned) : null,
      registered: Number(r.registered),
      rounds_created: Number(r.rounds_created),
      games_total: Number(r.games_total),
      games_finished: Number(r.games_finished),
      player_count: Number(r.registered),
      rounds_count: Number(r.rounds_created),
      can_manage: computeCanManageTournament(req.user, r)
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
              t.max_players, t.registration_deadline, t.rounds_planned,
              u.full_name AS owner_name,
              COALESCE(p.registered, 0) AS registered,
              COALESCE(p.rounds_created, 0) AS rounds_created,
              COALESCE(p.games_total, 0) AS games_total,
              COALESCE(p.games_finished, 0) AS games_finished
       FROM tournament t
       LEFT JOIN app_user u ON u.user_id = t.created_by
       LEFT JOIN v_tournament_progress p ON p.tournament_id = t.tournament_id
       WHERE t.tournament_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const r = rows[0];
    const item = {
      ...r,
      max_players: r.max_players != null ? Number(r.max_players) : null,
      rounds_planned: r.rounds_planned != null ? Number(r.rounds_planned) : null,
      registered: Number(r.registered),
      rounds_created: Number(r.rounds_created),
      games_total: Number(r.games_total),
      games_finished: Number(r.games_finished),
      player_count: Number(r.registered),
      rounds_count: Number(r.rounds_created),
      can_manage: computeCanManageTournament(req.user, r)
    };
    return res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createTournament = async (req, res, next) => {
  const {
    name,
    format,
    start_date,
    end_date,
    max_players = null,
    registration_deadline = null,
    rounds_planned = null
  } = req.body;
  const createdBy = req.user.user_id;

  try {
    const [result] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, registration_deadline, rounds_planned)
       VALUES (?, ?, ?, ?, 'UPCOMING', ?, ?, ?, ?)`,
      [name, format, start_date, end_date, createdBy, max_players, registration_deadline, rounds_planned]
    );

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'CREATE',
      entity: 'TOURNAMENT',
      entity_id: result.insertId,
      details: { name, format, start_date, end_date, max_players, registration_deadline, rounds_planned }
    });

    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              t.max_players, t.registration_deadline, t.rounds_planned,
              u.full_name AS owner_name,
              COALESCE(p.registered, 0) AS registered,
              COALESCE(p.rounds_created, 0) AS rounds_created,
              COALESCE(p.games_total, 0) AS games_total,
              COALESCE(p.games_finished, 0) AS games_finished
       FROM tournament t
       LEFT JOIN app_user u ON u.user_id = t.created_by
       LEFT JOIN v_tournament_progress p ON p.tournament_id = t.tournament_id
       WHERE t.tournament_id = ?`,
      [result.insertId]
    );

    const r = rows[0];
    const item = {
      ...r,
      max_players: r.max_players != null ? Number(r.max_players) : null,
      rounds_planned: r.rounds_planned != null ? Number(r.rounds_planned) : null,
      registered: Number(r.registered),
      rounds_created: Number(r.rounds_created),
      games_total: Number(r.games_total),
      games_finished: Number(r.games_finished),
      player_count: Number(r.registered),
      rounds_count: Number(r.rounds_created),
      can_manage: computeCanManageTournament(req.user, r)
    };

    return res.status(201).json(item);
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

    const allowedColumns = ['name', 'format', 'start_date', 'end_date', 'max_players', 'registration_deadline', 'rounds_planned'];
    const fields = [];
    const values = [];

    for (const key of allowedColumns) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(
        `UPDATE tournament SET ${fields.join(', ')} WHERE tournament_id = ?`,
        values
      );
    }

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'UPDATE',
      entity: 'TOURNAMENT',
      entity_id: Number(id),
      details: updates
    });

    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              t.max_players, t.registration_deadline, t.rounds_planned,
              u.full_name AS owner_name,
              COALESCE(p.registered, 0) AS registered,
              COALESCE(p.rounds_created, 0) AS rounds_created,
              COALESCE(p.games_total, 0) AS games_total,
              COALESCE(p.games_finished, 0) AS games_finished
       FROM tournament t
       LEFT JOIN app_user u ON u.user_id = t.created_by
       LEFT JOIN v_tournament_progress p ON p.tournament_id = t.tournament_id
       WHERE t.tournament_id = ?`,
      [id]
    );

    const r = rows[0];
    const item = {
      ...r,
      max_players: r.max_players != null ? Number(r.max_players) : null,
      rounds_planned: r.rounds_planned != null ? Number(r.rounds_planned) : null,
      registered: Number(r.registered),
      rounds_created: Number(r.rounds_created),
      games_total: Number(r.games_total),
      games_finished: Number(r.games_finished),
      player_count: Number(r.registered),
      rounds_count: Number(r.rounds_created),
      can_manage: computeCanManageTournament(req.user, r)
    };

    return res.json(item);
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

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'REGISTER',
      entity: 'REGISTRATION',
      entity_id: result.insertId,
      details: { tournament_id: Number(tournamentId), player_id }
    });

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

  if (req.user && req.user.role !== 'PLAYER') {
    return res.status(403).json({
      error: 'Forbidden: Only players can self-register',
      message: 'Forbidden: Only players can self-register',
      code: 'FORBIDDEN'
    });
  }

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

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'REGISTER',
      entity: 'REGISTRATION',
      entity_id: result.insertId,
      details: { tournament_id: Number(tournamentId), player_id: playerId }
    });

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
              p.name AS player_name, p.country, p.current_rating, p.email, p.date_of_birth,
              p.gender, p.experience_level, p.club, p.fide_id,
              u.phone
       FROM registration r
       JOIN player p ON p.player_id = r.player_id
       LEFT JOIN app_user u ON u.player_id = p.player_id
       WHERE r.tournament_id = ?
       ORDER BY r.registered_at ASC`,
      [tournamentId]
    );

    let allowedSet = null;
    if (req.user && req.user.role === 'ORGANIZER') {
      const [accessRows] = await pool.query(
        'SELECT player_id FROM v_organizer_player_access WHERE organizer_user_id = ?',
        [req.user.user_id]
      );
      allowedSet = new Set(accessRows.map(r => Number(r.player_id)));
    }

    const formatted = rows.map(r => {
      let seesSensitive = false;
      if (req.user) {
        if (req.user.role === 'ADMIN') {
          seesSensitive = true;
        } else if (req.user.role === 'PLAYER') {
          seesSensitive = req.user.player_id != null && Number(req.user.player_id) === Number(r.player_id);
        } else if (req.user.role === 'ORGANIZER') {
          if (allowedSet) {
            seesSensitive = allowedSet.has(Number(r.player_id));
          }
        }
      }

      const item = {
        registration_id: r.registration_id,
        tournament_id: r.tournament_id,
        player_id: r.player_id,
        rating_at_entry: r.rating_at_entry,
        registered_at: r.registered_at,
        player_name: r.player_name,
        country: r.country,
        current_rating: r.current_rating,
        gender: r.gender,
        experience_level: r.experience_level,
        club: r.club,
        fide_id: r.fide_id
      };

      if (seesSensitive) {
        item.email = r.email;
        item.date_of_birth = r.date_of_birth;
        if (r.phone !== undefined) {
          item.phone = r.phone;
        }
      }

      return item;
    });

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

export const removeRegistration = async (req, res, next) => {
  const { id: tournamentId, playerId } = req.params;

  try {
    const [tRows] = await pool.query(
      'SELECT tournament_id, status, created_by FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tRows[0];

    // Only while the tournament is UPCOMING
    if (tournament.status !== 'UPCOMING') {
      return res.status(400).json({
        error: 'Players can only be removed while the tournament is UPCOMING',
        message: 'Players can only be removed while the tournament is UPCOMING',
        code: 'NOT_UPCOMING'
      });
    }

    // Permission check: ADMIN any; ORGANIZER only own tournaments
    if (req.user.role === 'ADMIN') {
      // Allowed
    } else if (req.user.role === 'ORGANIZER') {
      if (tournament.created_by == null || Number(tournament.created_by) !== Number(req.user.user_id)) {
        return res.status(403).json({
          error: 'Forbidden: You can only remove players from tournaments you created',
          message: 'Forbidden: You can only remove players from tournaments you created',
          code: 'FORBIDDEN'
        });
      }
    } else {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    const [delResult] = await pool.query(
      'DELETE FROM registration WHERE tournament_id = ? AND player_id = ?',
      [tournamentId, playerId]
    );

    if (delResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Player registration not found for this tournament' });
    }

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'REMOVE_PLAYER',
      entity: 'REGISTRATION',
      entity_id: Number(playerId),
      details: { tournament_id: Number(tournamentId), player_id: Number(playerId) }
    });

    return res.status(200).json({
      message: 'Player registration removed successfully'
    });
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

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'CREATE',
      entity: 'ROUND',
      entity_id: insertResult.insertId,
      details: { tournament_id: Number(tournamentId), round_no: nextRoundNo }
    });

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

export const startTournament = async (req, res, next) => {
  const { id } = req.params;

  try {
    const isOwner = await checkTournamentOwnership(req, res, id);
    if (!isOwner) return;

    await pool.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [id]);

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'START',
      entity: 'TOURNAMENT',
      entity_id: Number(id),
      details: {}
    });

    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              t.max_players, t.registration_deadline, t.rounds_planned,
              u.full_name AS owner_name,
              COALESCE(p.registered, 0) AS registered,
              COALESCE(p.rounds_created, 0) AS rounds_created,
              COALESCE(p.games_total, 0) AS games_total,
              COALESCE(p.games_finished, 0) AS games_finished
       FROM tournament t
       LEFT JOIN app_user u ON u.user_id = t.created_by
       LEFT JOIN v_tournament_progress p ON p.tournament_id = t.tournament_id
       WHERE t.tournament_id = ?`,
      [id]
    );

    const r = rows[0];
    const item = {
      ...r,
      max_players: r.max_players != null ? Number(r.max_players) : null,
      rounds_planned: r.rounds_planned != null ? Number(r.rounds_planned) : null,
      registered: Number(r.registered),
      rounds_created: Number(r.rounds_created),
      games_total: Number(r.games_total),
      games_finished: Number(r.games_finished),
      player_count: Number(r.registered),
      rounds_count: Number(r.rounds_created),
      can_manage: computeCanManageTournament(req.user, r)
    };

    return res.json(item);
  } catch (err) {
    next(err);
  }
};

export const completeTournament = async (req, res, next) => {
  const { id } = req.params;

  try {
    const isOwner = await checkTournamentOwnership(req, res, id);
    if (!isOwner) return;

    await pool.query("UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = ?", [id]);

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'COMPLETE',
      entity: 'TOURNAMENT',
      entity_id: Number(id),
      details: {}
    });

    const [rows] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status, t.created_by,
              t.max_players, t.registration_deadline, t.rounds_planned,
              u.full_name AS owner_name,
              COALESCE(p.registered, 0) AS registered,
              COALESCE(p.rounds_created, 0) AS rounds_created,
              COALESCE(p.games_total, 0) AS games_total,
              COALESCE(p.games_finished, 0) AS games_finished
       FROM tournament t
       LEFT JOIN app_user u ON u.user_id = t.created_by
       LEFT JOIN v_tournament_progress p ON p.tournament_id = t.tournament_id
       WHERE t.tournament_id = ?`,
      [id]
    );

    const r = rows[0];
    const item = {
      ...r,
      max_players: r.max_players != null ? Number(r.max_players) : null,
      rounds_planned: r.rounds_planned != null ? Number(r.rounds_planned) : null,
      registered: Number(r.registered),
      rounds_created: Number(r.rounds_created),
      games_total: Number(r.games_total),
      games_finished: Number(r.games_finished),
      player_count: Number(r.registered),
      rounds_count: Number(r.rounds_created),
      can_manage: computeCanManageTournament(req.user, r)
    };

    return res.json(item);
  } catch (err) {
    next(err);
  }
};

export const getTournamentProgress = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM v_tournament_progress WHERE tournament_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const row = rows[0];
    return res.json({
      ...row,
      registered: Number(row.registered),
      rounds_created: Number(row.rounds_created),
      games_total: Number(row.games_total),
      games_finished: Number(row.games_finished),
      max_players: row.max_players != null ? Number(row.max_players) : null,
      rounds_planned: row.rounds_planned != null ? Number(row.rounds_planned) : null
    });
  } catch (err) {
    next(err);
  }
};

export const generateNextRound = async (req, res, next) => {
  const { id: tournamentId } = req.params;

  let conn;
  try {
    const isOwner = await checkTournamentOwnership(req, res, tournamentId);
    if (!isOwner) return;

    // Check status
    const [tRows] = await pool.query(
      'SELECT tournament_id, status, rounds_planned FROM tournament WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tRows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tRows[0];
    if (tournament.status !== 'ONGOING') {
      return res.status(400).json({
        error: 'Rounds can only be created while the tournament is ONGOING',
        message: 'Rounds can only be created while the tournament is ONGOING'
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [players] = await conn.query(
      'SELECT player_id FROM registration WHERE tournament_id = ? ORDER BY player_id ASC',
      [tournamentId]
    );

    if (players.length < 2) {
      await conn.rollback();
      conn.release();
      conn = null;
      return res.status(400).json({
        error: 'At least 2 registered players are needed to start the tournament',
        message: 'At least 2 registered players are needed to start the tournament'
      });
    }

    const [existingRounds] = await conn.query(
      'SELECT round_id, round_no, status FROM tournament_round WHERE tournament_id = ? ORDER BY round_no ASC',
      [tournamentId]
    );

    const playerIds = players.map(p => p.player_id);
    const n = playerIds.length;
    const list = [...playerIds];
    if (n % 2 !== 0) {
      list.push(null);
    }
    const m = list.length;
    const totalRounds = m - 1;

    const maxRoundsAllowed = tournament.rounds_planned
      ? Math.min(tournament.rounds_planned, totalRounds)
      : totalRounds;

    if (existingRounds.length >= maxRoundsAllowed || existingRounds.length >= totalRounds) {
      await conn.rollback();
      conn.release();
      conn = null;
      return res.status(400).json({
        error: 'All rounds have been generated',
        message: 'All rounds have been generated'
      });
    }

    // Build the full schedule with color alternation up to all rounds
    const schedule = [];
    const stats = {};
    for (const pid of playerIds) {
      stats[pid] = { white: 0, black: 0, last: null };
    }

    let current = [...list];
    for (let r = 0; r < totalRounds; r++) {
      const roundPairs = [];
      for (let i = 0; i < m / 2; i++) {
        const p1 = current[i];
        const p2 = current[m - 1 - i];
        if (p1 !== null && p2 !== null) {
          let white = p1;
          let black = p2;
          const diff1 = stats[p1].white - stats[p1].black;
          const diff2 = stats[p2].white - stats[p2].black;

          if (diff1 < diff2) {
            white = p1;
            black = p2;
          } else if (diff1 > diff2) {
            white = p2;
            black = p1;
          } else {
            if (stats[p1].last === 'B' && stats[p2].last === 'W') {
              white = p1;
              black = p2;
            } else if (stats[p1].last === 'W' && stats[p2].last === 'B') {
              white = p2;
              black = p1;
            } else {
              if ((i + r) % 2 === 0) {
                white = p1;
                black = p2;
              } else {
                white = p2;
                black = p1;
              }
            }
          }
          roundPairs.push({ white, black });
        } else {
          roundPairs.push({ bye: p1 || p2 });
        }
      }

      roundPairs.forEach(pair => {
        if (!pair.bye) {
          stats[pair.white].white++;
          stats[pair.white].last = 'W';
          stats[pair.black].black++;
          stats[pair.black].last = 'B';
        }
      });

      schedule.push(roundPairs);

      const fixed = current[0];
      const rest = current.slice(1);
      const last = rest.pop();
      rest.unshift(last);
      current = [fixed, ...rest];
    }

    const nextRoundIndex = existingRounds.length;
    const nextRoundNo = nextRoundIndex + 1;
    const nextRoundPairings = schedule[nextRoundIndex];

    const [roundInsert] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [tournamentId, nextRoundNo, 'SCHEDULED']
    );
    const roundId = roundInsert.insertId;

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'CREATE',
      entity: 'ROUND',
      entity_id: roundId,
      details: { tournament_id: Number(tournamentId), round_no: nextRoundNo }
    }, conn);

    let boardNo = 1;
    for (const pair of nextRoundPairings) {
      if (pair.bye) continue;
      const [gameInsert] = await conn.query(
        `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
         VALUES (?, ?, ?, ?, 'SCHEDULED')`,
        [roundId, boardNo, pair.white, pair.black]
      );
      await logAudit({
        actor_user_id: req.user.user_id,
        action: 'CREATE',
        entity: 'GAME',
        entity_id: gameInsert.insertId,
        details: { round_id: roundId, board_no: boardNo, white_player_id: pair.white, black_player_id: pair.black }
      }, conn);
      boardNo++;
    }

    await conn.commit();
    conn.release();
    conn = null;

    const [roundRows] = await pool.query(
      'SELECT round_id, tournament_id, round_no, status FROM tournament_round WHERE round_id = ?',
      [roundId]
    );

    const [games] = await pool.query(
      `SELECT g.game_id, g.round_id, g.board_no,
              g.white_player_id, wp.name AS white_player_name, wp.current_rating AS white_player_rating,
              g.black_player_id, bp.name AS black_player_name, bp.current_rating AS black_player_rating,
              g.start_time, g.end_time, g.status
       FROM game g
       JOIN player wp ON wp.player_id = g.white_player_id
       JOIN player bp ON bp.player_id = g.black_player_id
       WHERE g.round_id = ?
       ORDER BY g.board_no ASC`,
      [roundId]
    );

    return res.status(201).json({
      ...roundRows[0],
      games
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rbErr) {
        // ignore
      }
      conn.release();
    }
    next(err);
  }
};

export default {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  startTournament,
  completeTournament,
  getTournamentProgress,
  generateNextRound,
  registerPlayer,
  registerMe,
  getRegistrations,
  removeRegistration,
  createRound,
  getRounds,
  getStandings,
  getTournamentAnalytics,
  getTournamentPredictions,
  createTournamentSchema,
  updateTournamentSchema,
  registerPlayerSchema
};
