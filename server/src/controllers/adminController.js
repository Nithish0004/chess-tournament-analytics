import { pool } from '../config/db.js';
import { sendAccountApprovedEmail, sendAccountRejectedEmail } from '../services/mailService.js';
import { logAudit } from '../utils/auditLogger.js';

export const getUsers = async (req, res, next) => {
  const { status, role, approval_status, q, limit, offset } = req.query;

  try {
    let sql = `
      SELECT u.user_id, u.email, u.full_name, u.role, u.status, u.approval_status,
             u.approved_by, u.approved_at, u.approval_note, u.email_verified,
             u.phone, u.organization, u.player_id, u.failed_logins, u.locked_until,
             u.last_login_at, u.created_at,
             p.name AS player_name, p.country AS player_country, p.date_of_birth,
             p.gender, p.experience_level, p.club, p.fide_id, p.current_rating
      FROM app_user u
      LEFT JOIN player p ON p.player_id = u.player_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }
    if (approval_status) {
      sql += ' AND u.approval_status = ?';
      params.push(approval_status);
    }
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      sql += ' AND (u.email LIKE ? OR u.full_name LIKE ? OR p.name LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY u.created_at DESC';

    if (limit !== undefined) {
      const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
      const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);
      sql += ' LIMIT ? OFFSET ?';
      params.push(parsedLimit, parsedOffset);
    }

    const [rows] = await pool.query(sql, params);

    const formattedRows = rows.map(u => {
      let playerProfile = null;
      if (u.player_id) {
        playerProfile = {
          player_id: u.player_id,
          name: u.player_name || u.full_name,
          email: u.email,
          country: u.player_country,
          date_of_birth: u.date_of_birth,
          gender: u.gender,
          experience_level: u.experience_level,
          club: u.club,
          fide_id: u.fide_id,
          current_rating: u.current_rating
        };
      }
      return {
        ...u,
        player: playerProfile
      };
    });

    return res.status(200).json(formattedRows);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT user_id, email, full_name, role, status, approval_status,
              approved_by, approved_at, approval_note, email_verified,
              phone, organization, player_id, failed_logins, locked_until,
              last_login_at, created_at
       FROM app_user
       WHERE user_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Linked player profile
    if (user.player_id) {
      const [playerRows] = await pool.query(
        `SELECT player_id, name, email, country, date_of_birth, gender,
                experience_level, club, fide_id, current_rating, created_at
         FROM player
         WHERE player_id = ?`,
        [user.player_id]
      );
      if (playerRows.length > 0) {
        user.player = playerRows[0];
      }
    }

    // For organizers: also tournament count
    if (user.role === 'ORGANIZER') {
      const [tCountRows] = await pool.query(
        'SELECT COUNT(*) AS total FROM tournament WHERE created_by = ?',
        [user.user_id]
      );
      const count = Number(tCountRows[0]?.total || 0);
      user.tournaments_count = count;
      user.tournament_count = count;
    }

    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body || {};

  // Forbid editing role, email, password, or rating
  if (updates.current_rating !== undefined || updates.rating !== undefined) {
    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'REJECT_RATING_EDIT',
      entity: 'USER',
      entity_id: Number(id),
      details: { attempted_rating: updates.current_rating || updates.rating }
    });
    return res.status(400).json({
      error: 'Rating cannot be edited directly',
      message: 'Rating cannot be edited directly'
    });
  }

  if (updates.role !== undefined) {
    return res.status(400).json({
      error: 'Role cannot be edited through this endpoint',
      message: 'Role cannot be edited through this endpoint'
    });
  }

  if (updates.email !== undefined || updates.password !== undefined || updates.password_hash !== undefined) {
    return res.status(400).json({
      error: 'Email or password cannot be edited through this endpoint',
      message: 'Email or password cannot be edited through this endpoint'
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userRows] = await conn.query(
      'SELECT user_id, email, full_name, role, player_id FROM app_user WHERE user_id = ?',
      [id]
    );

    if (userRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // Allowed app_user fields: full_name, phone, organization
    const userFields = [];
    const userVals = [];

    if (updates.full_name !== undefined) {
      userFields.push('full_name = ?');
      userVals.push(updates.full_name);
    }
    if (updates.phone !== undefined) {
      userFields.push('phone = ?');
      userVals.push(updates.phone);
    }
    if (updates.organization !== undefined) {
      userFields.push('organization = ?');
      userVals.push(updates.organization);
    }

    if (userFields.length > 0) {
      userVals.push(id);
      await conn.query(
        `UPDATE app_user SET ${userFields.join(', ')} WHERE user_id = ?`,
        userVals
      );
    }

    // Allowed linked player fields: name, country, date_of_birth, gender, experience_level, club, fide_id
    if (user.player_id) {
      const playerFields = [];
      const playerVals = [];

      const playerName = updates.name !== undefined ? updates.name : updates.full_name;
      if (playerName !== undefined) {
        playerFields.push('name = ?');
        playerVals.push(playerName);
      }
      if (updates.country !== undefined) {
        playerFields.push('country = ?');
        playerVals.push(updates.country);
      }
      if (updates.date_of_birth !== undefined) {
        playerFields.push('date_of_birth = ?');
        playerVals.push(updates.date_of_birth);
      }
      if (updates.gender !== undefined) {
        playerFields.push('gender = ?');
        playerVals.push(updates.gender);
      }
      if (updates.experience_level !== undefined) {
        playerFields.push('experience_level = ?');
        playerVals.push(updates.experience_level);
      }
      if (updates.club !== undefined) {
        playerFields.push('club = ?');
        playerVals.push(updates.club);
      }
      if (updates.fide_id !== undefined) {
        playerFields.push('fide_id = ?');
        playerVals.push(updates.fide_id);
      }

      if (playerFields.length > 0) {
        playerVals.push(user.player_id);
        await conn.query(
          `UPDATE player SET ${playerFields.join(', ')} WHERE player_id = ?`,
          playerVals
        );
      }
    }

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'UPDATE',
      entity: 'USER',
      entity_id: Number(id),
      details: updates
    }, conn);

    await conn.commit();

    const [updatedRows] = await pool.query(
      `SELECT user_id, email, full_name, role, status, approval_status,
              approved_by, approved_at, approval_note, email_verified,
              phone, organization, player_id, created_at, last_login_at
       FROM app_user WHERE user_id = ?`,
      [id]
    );

    const updatedUser = updatedRows[0];
    if (updatedUser.player_id) {
      const [playerRows] = await pool.query(
        'SELECT player_id, name, email, country, date_of_birth, gender, experience_level, club, fide_id, current_rating FROM player WHERE player_id = ?',
        [updatedUser.player_id]
      );
      updatedUser.player = playerRows[0] || null;
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const approveUser = async (req, res, next) => {
  const { id } = req.params;
  const { starting_rating } = req.body || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT user_id, email, full_name, role, status, approval_status, player_id FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Set approval status, approver, and approved timestamp
    await conn.query(
      "UPDATE app_user SET approval_status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE user_id = ?",
      [req.user.user_id, id]
    );

    // If PLAYER: handle starting_rating logic
    let appliedRating = null;
    if (user.role === 'PLAYER' && user.player_id) {
      // Check if player has played any games
      const [rhCountRows] = await conn.query(
        'SELECT COUNT(*) AS cnt FROM rating_history WHERE player_id = ?',
        [user.player_id]
      );
      const hasGames = Number(rhCountRows[0]?.cnt || 0) > 0;

      if (!hasGames) {
        if (starting_rating !== undefined && starting_rating !== null) {
          const numRating = Number(starting_rating);
          if (isNaN(numRating) || numRating < 100 || numRating > 3500) {
            await conn.rollback();
            return res.status(400).json({
              error: 'starting_rating must be between 100 and 3500',
              message: 'starting_rating must be between 100 and 3500'
            });
          }
          appliedRating = numRating;
        } else {
          // Default by experience_level: BEGINNER 1000, INTERMEDIATE 1200, ADVANCED 1500, EXPERT 1800
          const [playerRows] = await conn.query(
            'SELECT experience_level FROM player WHERE player_id = ?',
            [user.player_id]
          );
          const exp = playerRows[0]?.experience_level;
          switch (exp) {
            case 'BEGINNER':
              appliedRating = 1000;
              break;
            case 'INTERMEDIATE':
              appliedRating = 1200;
              break;
            case 'ADVANCED':
              appliedRating = 1500;
              break;
            case 'EXPERT':
              appliedRating = 1800;
              break;
            default:
              appliedRating = 1200;
              break;
          }
        }

        await conn.query(
          'UPDATE player SET current_rating = ? WHERE player_id = ?',
          [appliedRating, user.player_id]
        );
      }
      // If player already has games, ignore starting_rating as required
    }

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'APPROVE',
      entity: 'USER',
      entity_id: Number(id),
      details: {
        email: user.email,
        role: user.role,
        starting_rating: starting_rating || null,
        applied_rating: appliedRating
      }
    }, conn);

    await conn.commit();

    // Send notification email
    await sendAccountApprovedEmail(user.email, user.full_name);

    return res.status(200).json({
      message: 'Account approved successfully',
      applied_rating: appliedRating
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const approveOrganizer = approveUser;

export const rejectUser = async (req, res, next) => {
  const { id } = req.params;
  const { note } = req.body || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT user_id, email, full_name, role, status FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    await conn.query(
      "UPDATE app_user SET approval_status = 'REJECTED', approval_note = ? WHERE user_id = ?",
      [note || null, id]
    );

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'REJECT',
      entity: 'USER',
      entity_id: Number(id),
      details: { email: user.email, role: user.role, note: note || null }
    }, conn);

    await conn.commit();

    // Send notification email
    await sendAccountRejectedEmail(user.email, user.full_name, note);

    return res.status(200).json({
      message: 'Account rejected successfully'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const suspendUser = async (req, res, next) => {
  const { id } = req.params;

  if (Number(id) === Number(req.user.user_id)) {
    return res.status(400).json({
      error: 'An admin cannot suspend themselves',
      message: 'An admin cannot suspend themselves'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, role, status FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      "UPDATE app_user SET status = 'SUSPENDED' WHERE user_id = ?",
      [id]
    );

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'SUSPEND',
      entity: 'USER',
      entity_id: Number(id),
      details: { email: rows[0].email, role: rows[0].role }
    });

    return res.status(200).json({
      message: 'User suspended successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const reactivateUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, role, status FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      "UPDATE app_user SET status = 'ACTIVE' WHERE user_id = ?",
      [id]
    );

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'REACTIVATE',
      entity: 'USER',
      entity_id: Number(id),
      details: { email: rows[0].email, role: rows[0].role }
    });

    return res.status(200).json({
      message: 'User reactivated successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;

  if (Number(id) === Number(req.user.user_id)) {
    return res.status(400).json({
      error: 'An admin cannot change their own role',
      message: 'An admin cannot change their own role'
    });
  }

  if (!role || !['ADMIN', 'ORGANIZER', 'PLAYER'].includes(role)) {
    return res.status(400).json({
      error: 'Role must be ADMIN, ORGANIZER, or PLAYER',
      message: 'Role must be ADMIN, ORGANIZER, or PLAYER'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, role, email FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      'UPDATE app_user SET role = ? WHERE user_id = ?',
      [role, id]
    );

    await logAudit({
      actor_user_id: req.user.user_id,
      action: 'UPDATE_ROLE',
      entity: 'USER',
      entity_id: Number(id),
      details: { email: rows[0].email, old_role: rows[0].role, new_role: role }
    });

    return res.status(200).json({
      message: 'User role updated successfully',
      user_id: Number(id),
      role
    });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  const { entity, actor, limit = 50, offset = 0 } = req.query;
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  try {
    let whereClauses = [];
    let params = [];

    if (entity) {
      whereClauses.push('a.entity = ?');
      params.push(String(entity).toUpperCase());
    }

    if (actor) {
      whereClauses.push('(a.actor_user_id = ? OR u.email LIKE ? OR u.full_name LIKE ?)');
      const actorSearch = `%${actor}%`;
      params.push(Number(actor) || 0, actorSearch, actorSearch);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM audit_log a
       LEFT JOIN app_user u ON u.user_id = a.actor_user_id
       ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const queryParams = [...params, parsedLimit, parsedOffset];
    const [rows] = await pool.query(
      `SELECT a.log_id, a.actor_user_id, a.action, a.entity, a.entity_id, a.details, a.created_at,
              u.full_name AS actor_name, u.email AS actor_email
       FROM audit_log a
       LEFT JOIN app_user u ON u.user_id = a.actor_user_id
       ${whereSql}
       ORDER BY a.created_at DESC, a.log_id DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    const formattedRows = rows.map(r => ({
      ...r,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details
    }));

    return res.status(200).json({
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      logs: formattedRows
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getUsers,
  getUserById,
  updateUser,
  approveUser,
  approveOrganizer,
  rejectUser,
  suspendUser,
  reactivateUser,
  updateUserRole,
  getAuditLogs
};
