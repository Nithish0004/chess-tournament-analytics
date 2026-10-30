import { z } from 'zod';
import { pool } from '../config/db.js';
import { checkGameOwnership } from '../middleware/authMiddleware.js';

export const recordResultSchema = z.object({
  outcome: z.enum(['WHITE', 'BLACK', 'DRAW'], {
    errorMap: () => ({ message: 'Outcome must be WHITE, BLACK, or DRAW' })
  })
});

export const recordGameResult = async (req, res, next) => {
  const { id: gameId } = req.params;
  const { outcome } = req.body;

  try {
    const isOwner = await checkGameOwnership(req, res, gameId);
    if (!isOwner) return;

    // Record result strictly by executing the stored procedure
    await pool.query('CALL record_result(?, ?)', [gameId, outcome]);

    // Fetch the recorded result and details
    const [resultRows] = await pool.query(
      `SELECT r.game_id, r.outcome, r.is_upset, r.recorded_at,
              g.round_id, g.board_no, g.status AS game_status,
              wp.name AS white_player_name, wp.current_rating AS white_current_rating,
              bp.name AS black_player_name, bp.current_rating AS black_current_rating
       FROM result r
       JOIN game g ON g.game_id = r.game_id
       JOIN player wp ON wp.player_id = g.white_player_id
       JOIN player bp ON bp.player_id = g.black_player_id
       WHERE r.game_id = ?`,
      [gameId]
    );

    const [ratingHistoryRows] = await pool.query(
      `SELECT rh.player_id, p.name, rh.old_rating, rh.new_rating, rh.rating_change
       FROM rating_history rh
       JOIN player p ON p.player_id = rh.player_id
       WHERE rh.game_id = ?
       ORDER BY rh.history_id ASC`,
      [gameId]
    );

    return res.status(200).json({
      message: 'Result recorded successfully',
      result: resultRows[0],
      rating_changes: ratingHistoryRows
    });
  } catch (err) {
    next(err);
  }
};

export const getRecentResults = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.game_id, tr.tournament_id, t.name AS tournament_name, tr.round_no, g.board_no,
              wp.player_id AS white_player_id, wp.name AS white_player_name, wp.current_rating AS white_current_rating,
              bp.player_id AS black_player_id, bp.name AS black_player_name, bp.current_rating AS black_current_rating,
              r.outcome, r.is_upset, r.recorded_at
       FROM result r
       JOIN game g ON g.game_id = r.game_id
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN tournament t ON t.tournament_id = tr.tournament_id
       ORDER BY r.recorded_at DESC
       LIMIT 10`
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

export default {
  recordGameResult,
  getRecentResults,
  recordResultSchema
};
