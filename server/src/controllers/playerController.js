import { z } from 'zod';
import { pool } from '../config/db.js';

export const createPlayerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(120),
  country: z.string().trim().max(60).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format').optional().nullable(),
  current_rating: z.number().int().min(100, 'Rating must be at least 100').max(3500, 'Rating cannot exceed 3500').optional().default(1200)
});

export const updatePlayerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(120).optional(),
  country: z.string().trim().max(60).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format').optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export const checkNoDirectRatingEdit = (req, res, next) => {
  if (req.body && req.body.current_rating !== undefined) {
    return res.status(400).json({
      error: 'Rating cannot be edited directly',
      message: 'Rating cannot be edited directly'
    });
  }
  next();
};

export const getPlayers = async (req, res, next) => {
  const { q } = req.query;

  try {
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      const [rows] = await pool.query(
        `SELECT p.player_id, p.name, p.email, p.country, p.date_of_birth, p.current_rating, p.created_at,
                COALESCE(vp.games_played, 0) AS games_played,
                COALESCE(vp.wins, 0) AS wins,
                COALESCE(vp.draws, 0) AS draws,
                COALESCE(vp.losses, 0) AS losses
         FROM player p
         LEFT JOIN v_player_performance vp ON vp.player_id = p.player_id
         WHERE p.name LIKE ?
         ORDER BY p.current_rating DESC, p.player_id ASC`,
        [searchTerm]
      );
      return res.json(rows.map(r => ({
        ...r,
        games_played: Number(r.games_played),
        wins: Number(r.wins),
        draws: Number(r.draws),
        losses: Number(r.losses)
      })));
    }

    const [rows] = await pool.query(
      `SELECT p.player_id, p.name, p.email, p.country, p.date_of_birth, p.current_rating, p.created_at,
              COALESCE(vp.games_played, 0) AS games_played,
              COALESCE(vp.wins, 0) AS wins,
              COALESCE(vp.draws, 0) AS draws,
              COALESCE(vp.losses, 0) AS losses
       FROM player p
       LEFT JOIN v_player_performance vp ON vp.player_id = p.player_id
       ORDER BY p.player_id ASC`
    );
    return res.json(rows.map(r => ({
      ...r,
      games_played: Number(r.games_played),
      wins: Number(r.wins),
      draws: Number(r.draws),
      losses: Number(r.losses)
    })));
  } catch (err) {
    next(err);
  }
};

export const getPlayerById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT player_id, name, email, country, date_of_birth, current_rating, created_at FROM player WHERE player_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const createPlayer = async (req, res, next) => {
  const { name, email, country = null, date_of_birth = null, current_rating = 1200 } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, current_rating)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, country, date_of_birth, current_rating]
    );

    const [rows] = await pool.query(
      'SELECT player_id, name, email, country, date_of_birth, current_rating, created_at FROM player WHERE player_id = ?',
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updatePlayer = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  if (req.user && req.user.role === 'PLAYER') {
    if (Number(id) !== Number(req.user.player_id)) {
      return res.status(403).json({
        error: 'Forbidden: You can only update your own player profile',
        code: 'FORBIDDEN'
      });
    }
  }

  if (updates && updates.current_rating !== undefined) {
    return res.status(400).json({
      error: 'Rating cannot be edited directly',
      message: 'Rating cannot be edited directly'
    });
  }

  try {
    // Verify player exists
    const [existing] = await pool.query('SELECT player_id FROM player WHERE player_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const allowedColumns = ['name', 'email', 'country', 'date_of_birth'];
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
      `UPDATE player SET ${fields.join(', ')} WHERE player_id = ?`,
      values
    );

    const [rows] = await pool.query(
      'SELECT player_id, name, email, country, date_of_birth, current_rating, created_at FROM player WHERE player_id = ?',
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const getPlayerAnalytics = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify player exists
    const [playerRows] = await pool.query(
      'SELECT player_id, name, email, country, date_of_birth, current_rating, created_at FROM player WHERE player_id = ?',
      [id]
    );

    if (playerRows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = playerRows[0];

    // Row from v_player_performance
    const [perfRows] = await pool.query(
      'SELECT * FROM v_player_performance WHERE player_id = ?',
      [id]
    );

    // Rows from v_rating_progression
    const [progressionRows] = await pool.query(
      'SELECT * FROM v_rating_progression WHERE player_id = ? ORDER BY game_no ASC',
      [id]
    );

    // Tournament history: standings joined with tournament
    const [tournamentHistoryRows] = await pool.query(
      `SELECT s.tournament_id,
              t.name AS tournament_name,
              t.format,
              t.start_date,
              t.end_date,
              t.status AS tournament_status,
              s.played,
              s.wins,
              s.draws,
              s.losses,
              s.points,
              s.rank_no
       FROM tournament_standings s
       JOIN tournament t ON t.tournament_id = s.tournament_id
       WHERE s.player_id = ?
       ORDER BY t.start_date DESC, s.tournament_id DESC`,
      [id]
    );

    // Opponent strength buckets: weaker (opp < my - 100), similar (within 100), stronger (opp > my + 100)
    const [bucketRows] = await pool.query(
      `SELECT
         CASE
           WHEN oh.old_rating < (rh.old_rating - 100) THEN 'weaker'
           WHEN oh.old_rating > (rh.old_rating + 100) THEN 'stronger'
           ELSE 'similar'
         END AS bucket,
         COUNT(pg.game_id) AS games,
         COALESCE(SUM(pg.score = 1), 0) AS wins,
         COALESCE(SUM(pg.score = 0.5), 0) AS draws,
         COALESCE(SUM(pg.score = 0), 0) AS losses,
         ROUND(100.0 * COALESCE(SUM(pg.score = 1), 0) / NULLIF(COUNT(pg.game_id), 0), 1) AS win_pct
       FROM v_player_games pg
       JOIN rating_history rh ON rh.player_id = pg.player_id AND rh.game_id = pg.game_id
       JOIN rating_history oh ON oh.player_id = pg.opponent_id AND oh.game_id = pg.game_id
       WHERE pg.player_id = ?
       GROUP BY bucket`,
      [id]
    );

    const defaultBuckets = {
      weaker: { bucket: 'weaker', label: 'Weaker (< -100)', games: 0, wins: 0, draws: 0, losses: 0, win_pct: 0 },
      similar: { bucket: 'similar', label: 'Similar (±100)', games: 0, wins: 0, draws: 0, losses: 0, win_pct: 0 },
      stronger: { bucket: 'stronger', label: 'Stronger (> +100)', games: 0, wins: 0, draws: 0, losses: 0, win_pct: 0 }
    };

    for (const b of bucketRows) {
      if (defaultBuckets[b.bucket]) {
        defaultBuckets[b.bucket] = {
          bucket: b.bucket,
          label: defaultBuckets[b.bucket].label,
          games: Number(b.games),
          wins: Number(b.wins),
          draws: Number(b.draws),
          losses: Number(b.losses),
          win_pct: Number(b.win_pct) || 0
        };
      }
    }

    const opponent_strength_buckets = [
      defaultBuckets.weaker,
      defaultBuckets.similar,
      defaultBuckets.stronger
    ];

    // Notable upset victories for this player from v_upsets
    const [upsetRows] = await pool.query(
      `SELECT u.tournament_id, u.game_id, u.winner, u.winner_rating, u.loser, u.loser_rating, u.rating_gap,
              t.name AS tournament_name
       FROM v_upsets u
       LEFT JOIN tournament t ON t.tournament_id = u.tournament_id
       WHERE u.winner = ?
       ORDER BY u.rating_gap DESC`,
      [player.name]
    );

    return res.json({
      player: playerRows[0],
      performance: perfRows[0] || null,
      rating_progression: progressionRows,
      tournament_history: tournamentHistoryRows,
      opponent_strength_buckets,
      upsets: upsetRows,
      notable_upsets: upsetRows
    });
  } catch (err) {
    next(err);
  }
};
