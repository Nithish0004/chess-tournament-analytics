import { verifyToken } from '../utils/jwt.js';
import { pool } from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

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
      'SELECT user_id, email, full_name, role, status, approval_status, approval_note, email_verified, player_id FROM app_user WHERE user_id = ?',
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
      approval_status: user.approval_status,
      approval_note: user.approval_note,
      player_id: user.player_id
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth = authMiddleware;

/**
 * Ensures user is APPROVED (or ADMIN).
 * Unapproved or rejected users get 403 {code:'NOT_APPROVED', message:'Your account is waiting for admin approval'}.
 */
export const requireApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role === 'ADMIN') {
    return next();
  }
  if (req.user.approval_status !== 'APPROVED') {
    return res.status(403).json({
      code: 'NOT_APPROVED',
      message: 'Your account is waiting for admin approval',
      error: 'Your account is waiting for admin approval'
    });
  }
  next();
};

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
 * Loads the tournament associated with the request (from tournament, round, or game)
 * and enforces the tournament RBAC rules:
 * - ADMIN on any tournament (even COMPLETED).
 * - If COMPLETED and non-ADMIN: 403 "Tournament is completed".
 * - PLAYER never: 403 "Forbidden: Players cannot manage tournaments".
 * - ORGANIZER only where created_by = their user_id: 403 otherwise.
 */
export const requireTournamentAccess = (from = 'tournament') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    let tournament = null;

    try {
      if (from === 'round') {
        const [rows] = await pool.query(
          `SELECT t.tournament_id, t.name, t.status, t.created_by
           FROM tournament_round tr
           JOIN tournament t ON t.tournament_id = tr.tournament_id
           WHERE tr.round_id = ?`,
          [id]
        );
        if (rows.length === 0) {
          const [rCheck] = await pool.query(
            'SELECT round_id FROM tournament_round WHERE round_id = ?',
            [id]
          );
          if (rCheck.length === 0) {
            return res.status(404).json({ error: 'Round not found' });
          }
          return res.status(404).json({ error: 'Tournament not found' });
        }
        tournament = rows[0];
      } else if (from === 'game') {
        const [rows] = await pool.query(
          `SELECT t.tournament_id, t.name, t.status, t.created_by
           FROM game g
           JOIN tournament_round tr ON tr.round_id = g.round_id
           JOIN tournament t ON t.tournament_id = tr.tournament_id
           WHERE g.game_id = ?`,
          [id]
        );
        if (rows.length === 0) {
          const [gCheck] = await pool.query(
            'SELECT game_id FROM game WHERE game_id = ?',
            [id]
          );
          if (gCheck.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
          }
          return res.status(404).json({ error: 'Tournament not found' });
        }
        tournament = rows[0];
      } else {
        const [rows] = await pool.query(
          'SELECT tournament_id, name, status, created_by FROM tournament WHERE tournament_id = ?',
          [id]
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Tournament not found' });
        }
        tournament = rows[0];
      }

      req.tournament = tournament;

      // ADMIN may manage any tournament, including COMPLETED ones
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // If the tournament is COMPLETED, only ADMIN may change anything about it
      if (tournament.status === 'COMPLETED') {
        return res.status(403).json({
          error: 'Tournament is completed',
          message: 'Tournament is completed',
          code: 'TOURNAMENT_COMPLETED'
        });
      }

      // PLAYER never manages tournaments
      if (req.user.role === 'PLAYER') {
        return res.status(403).json({
          error: 'Forbidden: Players cannot manage tournaments',
          message: 'Forbidden: Players cannot manage tournaments',
          code: 'FORBIDDEN'
        });
      }

      // ORGANIZER only where created_by = their user_id
      if (req.user.role === 'ORGANIZER') {
        if (tournament.created_by == null || Number(tournament.created_by) !== Number(req.user.user_id)) {
          return res.status(403).json({
            error: 'Forbidden: You can only manage tournaments you created',
            message: 'Forbidden: You can only manage tournaments you created',
            code: 'FORBIDDEN'
          });
        }
        return next();
      }

      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        code: 'FORBIDDEN'
      });
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Checks authorization for player update operations (PUT /api/players/:id):
 * - Direct rating edits are rejected with 400 "Rating cannot be edited directly".
 * - ADMIN: allowed on any player.
 * - PLAYER: allowed only where id = their player_id.
 * - ORGANIZER: allowed only when the player has NO linked app_user (app_user.player_id).
 */
const handleSelfOrAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Reject direct rating edit early if present
  if (req.body && req.body.current_rating !== undefined) {
    await logAudit({
      actor_user_id: req.user?.user_id,
      action: 'REJECT_RATING_EDIT',
      entity: 'PLAYER',
      entity_id: req.params.id ? Number(req.params.id) : null,
      details: { attempted_rating: req.body.current_rating }
    });
    return res.status(400).json({
      error: 'Rating cannot be edited directly',
      message: 'Rating cannot be edited directly'
    });
  }

  // ADMIN can edit any player
  if (req.user.role === 'ADMIN') {
    return next();
  }

  const targetPlayerId = Number(req.params.id);

  // PLAYER only where id = their player_id
  if (req.user.role === 'PLAYER') {
    if (req.user.player_id != null && Number(req.user.player_id) === targetPlayerId) {
      return next();
    }
    return res.status(403).json({
      error: 'Forbidden: You can only update your own player profile',
      message: 'Forbidden: You can only update your own player profile',
      code: 'FORBIDDEN'
    });
  }

  // ORGANIZER only when the player has NO linked app_user
  if (req.user.role === 'ORGANIZER') {
    try {
      const [playerRows] = await pool.query(
        'SELECT player_id FROM player WHERE player_id = ?',
        [targetPlayerId]
      );
      if (playerRows.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const [userRows] = await pool.query(
        'SELECT user_id FROM app_user WHERE player_id = ?',
        [targetPlayerId]
      );
      if (userRows.length > 0) {
        return res.status(403).json({
          error: 'Forbidden: Organizers can only edit players without a linked user account',
          message: 'Forbidden: Organizers can only edit players without a linked user account',
          code: 'FORBIDDEN'
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  }

  return res.status(403).json({
    error: 'Forbidden: Insufficient permissions',
    code: 'FORBIDDEN'
  });
};

export const requireSelfOrAdmin = (reqOrOptions, res, next) => {
  if (typeof next === 'function') {
    return handleSelfOrAdmin(reqOrOptions, res, next);
  }
  return (req, res, next) => handleSelfOrAdmin(req, res, next);
};

/**
 * Ownership verification helpers for backward compatibility.
 */
export const checkTournamentOwnership = async (req, res, tournamentId) => {
  if (req.user.role === 'ADMIN') return true;

  const [rows] = await pool.query(
    'SELECT tournament_id, created_by, status FROM tournament WHERE tournament_id = ?',
    [tournamentId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Tournament not found' });
    return false;
  }

  if (rows[0].status === 'COMPLETED') {
    res.status(403).json({
      error: 'Tournament is completed',
      message: 'Tournament is completed',
      code: 'TOURNAMENT_COMPLETED'
    });
    return false;
  }

  if (req.user.role === 'PLAYER') {
    res.status(403).json({
      error: 'Forbidden: Players cannot manage tournaments',
      code: 'FORBIDDEN'
    });
    return false;
  }

  if (rows[0].created_by == null || Number(rows[0].created_by) !== Number(req.user.user_id)) {
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

  const [rows] = await pool.query(
    `SELECT tr.round_id, t.created_by, t.status
     FROM tournament_round tr
     JOIN tournament t ON t.tournament_id = tr.tournament_id
     WHERE tr.round_id = ?`,
    [roundId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Round not found' });
    return false;
  }

  if (rows[0].status === 'COMPLETED') {
    res.status(403).json({
      error: 'Tournament is completed',
      message: 'Tournament is completed',
      code: 'TOURNAMENT_COMPLETED'
    });
    return false;
  }

  if (req.user.role === 'PLAYER') {
    res.status(403).json({
      error: 'Forbidden: Players cannot manage tournament rounds or games',
      code: 'FORBIDDEN'
    });
    return false;
  }

  if (rows[0].created_by == null || Number(rows[0].created_by) !== Number(req.user.user_id)) {
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

  const [rows] = await pool.query(
    `SELECT g.game_id, t.created_by, t.status
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

  if (rows[0].status === 'COMPLETED') {
    res.status(403).json({
      error: 'Tournament is completed',
      message: 'Tournament is completed',
      code: 'TOURNAMENT_COMPLETED'
    });
    return false;
  }

  if (req.user.role === 'PLAYER') {
    res.status(403).json({
      error: 'Forbidden: Players cannot record game results',
      code: 'FORBIDDEN'
    });
    return false;
  }

  if (rows[0].created_by == null || Number(rows[0].created_by) !== Number(req.user.user_id)) {
    res.status(403).json({
      error: 'Forbidden: You can only record results for tournaments you created',
      code: 'FORBIDDEN'
    });
    return false;
  }

  return true;
};

/**
 * Returns a permissions dictionary derived from role + approval.
 * Primary keys required:
 * { can_explore, can_join_tournaments, can_create_tournaments, can_manage_players }
 * (ADMIN: all true)
 */
export const getPermissions = (role, approvalStatus) => {
  const isApproved = approvalStatus === 'APPROVED';
  const isAdmin = role === 'ADMIN';

  const base = {
    can_explore: true,
    can_join_tournaments: isAdmin ? true : (role === 'PLAYER' && isApproved),
    can_create_tournaments: isAdmin ? true : (role === 'ORGANIZER' && isApproved),
    can_manage_players: isAdmin ? true : (role === 'ORGANIZER' && isApproved)
  };

  return {
    ...base,
    can_view_dashboard: true,
    can_view_tournaments: true,
    can_view_players: true,
    can_view_sensitive_player_data: isAdmin || (role === 'ORGANIZER' && isApproved),
    can_create_tournament: base.can_create_tournaments,
    can_manage_any_tournament: isAdmin,
    can_manage_completed_tournaments: isAdmin,
    can_create_player: isAdmin || (role === 'ORGANIZER' && isApproved),
    can_edit_all_players: isAdmin,
    can_edit_unlinked_players: role === 'ORGANIZER' && isApproved,
    can_register_players: base.can_manage_players,
    can_self_register: base.can_join_tournaments,
    can_create_rounds: base.can_create_tournaments,
    can_create_games: base.can_create_tournaments,
    can_record_results: base.can_manage_players,
    can_access_admin: isAdmin
  };
};

export default {
  authMiddleware,
  requireAuth,
  requireRole,
  requireApproved,
  requireTournamentAccess,
  requireSelfOrAdmin,
  checkTournamentOwnership,
  checkRoundOwnership,
  checkGameOwnership,
  getPermissions
};
