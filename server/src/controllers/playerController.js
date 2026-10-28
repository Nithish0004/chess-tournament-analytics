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
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format').optional().nullable(),
  current_rating: z.number().int().min(100).max(3500).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export const getPlayers = async (req, res, next) => {
  const { q } = req.query;

  try {
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      const [rows] = await pool.query(
        'SELECT player_id, name, email, country, date_of_birth, current_rating, created_at FROM player WHERE name LIKE ? ORDER BY current_rating DESC, player_id ASC',
        [searchTerm]
      );
      return res.json(rows);
    }

    const [rows] = await pool.query(
      'SELECT player_id, name, email, country, date_of_birth, current_rating, created_at FROM player ORDER BY player_id ASC'
    );
    return res.json(rows);
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

  try {
    // Verify player exists
    const [existing] = await pool.query('SELECT player_id FROM player WHERE player_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const allowedColumns = ['name', 'email', 'country', 'date_of_birth', 'current_rating'];
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

    return res.json({
      player: playerRows[0],
      performance: perfRows[0] || null,
      rating_progression: progressionRows,
      tournament_history: tournamentHistoryRows
    });
  } catch (err) {
    next(err);
  }
};
