import { z } from 'zod';
import { pool } from '../config/db.js';
import { checkRoundOwnership } from '../middleware/authMiddleware.js';

export const createGameSchema = z.object({
  board_no: z.number().int().positive('board_no must be a positive integer'),
  white_player_id: z.number().int().positive('white_player_id must be a positive integer'),
  black_player_id: z.number().int().positive('black_player_id must be a positive integer')
}).refine(data => data.white_player_id !== data.black_player_id, {
  message: 'White and black players must be different',
  path: ['black_player_id']
});

export const createGame = async (req, res, next) => {
  const { id: roundId } = req.params;
  const { board_no, white_player_id, black_player_id } = req.body;

  try {
    const isOwner = await checkRoundOwnership(req, res, roundId);
    if (!isOwner) return;

    const [roundRows] = await pool.query(
      'SELECT round_id, tournament_id, status FROM tournament_round WHERE round_id = ?',
      [roundId]
    );

    if (roundRows.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
       VALUES (?, ?, ?, ?, 'SCHEDULED')`,
      [roundId, board_no, white_player_id, black_player_id]
    );

    const [rows] = await pool.query(
      `SELECT g.game_id, g.round_id, g.board_no,
              g.white_player_id, wp.name AS white_player_name, wp.current_rating AS white_player_rating,
              g.black_player_id, bp.name AS black_player_name, bp.current_rating AS black_player_rating,
              g.start_time, g.end_time, g.status
       FROM game g
       JOIN player wp ON wp.player_id = g.white_player_id
       JOIN player bp ON bp.player_id = g.black_player_id
       WHERE g.game_id = ?`,
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const getGames = async (req, res, next) => {
  const { id: roundId } = req.params;

  try {
    const [roundRows] = await pool.query(
      'SELECT round_id, tournament_id, round_no, status FROM tournament_round WHERE round_id = ?',
      [roundId]
    );

    if (roundRows.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const [rows] = await pool.query(
      `SELECT g.game_id, g.round_id, g.board_no,
              g.white_player_id, wp.name AS white_player_name, wp.current_rating AS white_player_rating,
              g.black_player_id, bp.name AS black_player_name, bp.current_rating AS black_player_rating,
              g.start_time, g.end_time, g.status,
              r.outcome, r.is_upset, r.recorded_at
       FROM game g
       JOIN player wp ON wp.player_id = g.white_player_id
       JOIN player bp ON bp.player_id = g.black_player_id
       LEFT JOIN result r ON r.game_id = g.game_id
       WHERE g.round_id = ?
       ORDER BY g.board_no ASC`,
      [roundId]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

export default {
  createGame,
  getGames,
  createGameSchema
};
