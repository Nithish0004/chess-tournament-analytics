import { verifyToken } from '../utils/jwt.js';
import { pool } from '../config/db.js';

/**
 * Validates JWT bearer token and re-verifies user status=ACTIVE in MySQL.
 */
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!decoded || !decoded.user_id) {
    return res.status(401).json({ error: 'Invalid token payload' });
  }

  try {
    // Re-check status=ACTIVE in database so suspended/unverified users are blocked immediately
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, role, status, email_verified, player_id FROM app_user WHERE user_id = ?',
      [decoded.user_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User account not found' });
    }

    const user = rows[0];
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: `Account is ${user.status.toLowerCase().replace('_', ' ')}`,
        code: user.status
      });
    }

    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      player_id: user.player_id
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth = authMiddleware;

/**
 * Role-based authorization middleware.
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions for role ${req.user.role}. Required: ${roles.join(' or ')}`,
        code: 'FORBIDDEN'
      });
    }
    next();
  };
};

/**
 * Ownership verification helpers for tournaments, rounds, and games.
 */
export const checkTournamentOwnership = async (req, res, tournamentId) => {
  if (req.user.role === 'ADMIN') return true;
  if (req.user.role === 'PLAYER') {
    res.status(403).json({
      error: 'Forbidden: Players cannot manage tournaments',
      code: 'FORBIDDEN'
    });
    return false;
  }

  const [rows] = await pool.query(
    'SELECT tournament_id, created_by FROM tournament WHERE tournament_id = ?',
    [tournamentId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Tournament not found' });
    return false;
  }

  if (rows[0].created_by !== req.user.user_id) {
    res.status(403).json({
      error: 'Forbidden: You can only manage tournaments you created',
      code: 'FORBIDDEN'
    });
    return false;
  }

  return true;
};

export const checkRoundOwnership = async (req, res, roundId) => {
  if (req.user.role === 'ADMIN') return true;
  if (req.user.role === 'PLAYER') {
    res.status(403).json({
      error: 'Forbidden: Players cannot manage tournament rounds or games',
      code: 'FORBIDDEN'
    });
    return false;
  }

  const [rows] = await pool.query(
    `SELECT tr.round_id, t.created_by
     FROM tournament_round tr
     JOIN tournament t ON t.tournament_id = tr.tournament_id
     WHERE tr.round_id = ?`,
    [roundId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Round not found' });
    return false;
  }

  if (rows[0].created_by !== req.user.user_id) {
    res.status(403).json({
      error: 'Forbidden: You can only manage games in tournaments you created',
      code: 'FORBIDDEN'
    });
    return false;
  }

  return true;
};

export const checkGameOwnership = async (req, res, gameId) => {
  if (req.user.role === 'ADMIN') return true;
  if (req.user.role === 'PLAYER') {
    res.status(403).json({
      error: 'Forbidden: Players cannot record game results',
      code: 'FORBIDDEN'
    });
    return false;
  }

  const [rows] = await pool.query(
    `SELECT g.game_id, t.created_by
     FROM game g
     JOIN tournament_round tr ON tr.round_id = g.round_id
     JOIN tournament t ON t.tournament_id = tr.tournament_id
     WHERE g.game_id = ?`,
    [gameId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Game not found' });
    return false;
  }

  if (rows[0].created_by !== req.user.user_id) {
    res.status(403).json({
      error: 'Forbidden: You can only record results for tournaments you created',
      code: 'FORBIDDEN'
    });
    return false;
  }

  return true;
};

export default {
  authMiddleware,
  requireAuth,
  requireRole,
  checkTournamentOwnership,
  checkRoundOwnership,
  checkGameOwnership
};
