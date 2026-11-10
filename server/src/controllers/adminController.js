import { pool } from '../config/db.js';
import { sendAccountApprovedEmail, sendAccountRejectedEmail } from '../services/mailService.js';
import { logAudit } from '../utils/auditLogger.js';
import { getDbDiagnosticFacts } from '../services/dbDiagnostic.js';

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

/**
 * System Administration Overview (single round-trip consolidated metrics)
 * Restricted to ADMIN role only.
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    // 1. Users metrics
    const [userRows] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(role = 'ADMIN'), 0) as count_admin,
        COALESCE(SUM(role = 'ORGANIZER'), 0) as count_organizer,
        COALESCE(SUM(role = 'PLAYER'), 0) as count_player,
        COALESCE(SUM(created_at >= NOW() - INTERVAL 7 DAY), 0) as new_last_7_days,
        COALESCE(SUM(approval_status = 'PENDING'), 0) as pending_approvals
      FROM app_user
    `);

    const [pendingList] = await pool.query(`
      SELECT user_id, username, full_name, email, role, phone, organization, country_code, experience_level, club, fide_id, created_at
      FROM v_pending_approvals
      ORDER BY created_at ASC
      LIMIT 20
    `);

    const u = userRows[0] || {};
    const users = {
      total: Number(u.total || 0),
      roles: {
        ADMIN: Number(u.count_admin || 0),
        ORGANIZER: Number(u.count_organizer || 0),
        PLAYER: Number(u.count_player || 0)
      },
      new_last_7_days: Number(u.new_last_7_days || 0),
      pending_approvals: Number(u.pending_approvals || 0),
      pending_list: pendingList.map(item => ({
        user_id: item.user_id,
        username: item.username,
        full_name: item.full_name,
        email: item.email,
        role: item.role,
        phone: item.phone,
        organization: item.organization,
        country_code: item.country_code,
        experience_level: item.experience_level,
        club: item.club,
        fide_id: item.fide_id,
        created_at: item.created_at
      }))
    };

    // 2. Tournaments metrics
    const [statusRows] = await pool.query(`
      SELECT status, COUNT(*) as cnt
      FROM tournament
      GROUP BY status
    `);
    const statusCounts = { UPCOMING: 0, ONGOING: 0, COMPLETED: 0 };
    for (const row of statusRows) {
      if (statusCounts[row.status] !== undefined) {
        statusCounts[row.status] = Number(row.cnt);
      }
    }

    const [activeTournaments] = await pool.query(`
      SELECT 
        t.tournament_id,
        t.name,
        t.format,
        t.status,
        t.start_date,
        t.end_date,
        (SELECT COUNT(*) FROM registration r WHERE r.tournament_id = t.tournament_id) AS registered_players,
        (SELECT COUNT(*) FROM tournament_round tr WHERE tr.tournament_id = t.tournament_id AND tr.status = 'COMPLETED') AS rounds_completed,
        COALESCE(t.rounds_planned, (SELECT COUNT(*) FROM tournament_round tr WHERE tr.tournament_id = t.tournament_id), 0) AS total_rounds,
        (SELECT COUNT(*) FROM game g JOIN tournament_round tr ON tr.round_id = g.round_id WHERE tr.tournament_id = t.tournament_id AND g.status = 'FINISHED') AS games_recorded,
        (SELECT COUNT(*) FROM game g JOIN tournament_round tr ON tr.round_id = g.round_id WHERE tr.tournament_id = t.tournament_id) AS total_games
      FROM tournament t
      WHERE t.status IN ('ONGOING', 'UPCOMING')
      ORDER BY CASE t.status WHEN 'ONGOING' THEN 1 ELSE 2 END, t.start_date ASC
    `);

    const tournaments = {
      counts: statusCounts,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      active: activeTournaments.map(t => ({
        tournament_id: t.tournament_id,
        name: t.name,
        format: t.format,
        status: t.status,
        start_date: t.start_date,
        end_date: t.end_date,
        registered_players: Number(t.registered_players || 0),
        rounds_completed: Number(t.rounds_completed || 0),
        total_rounds: Number(t.total_rounds || 0),
        games_recorded: Number(t.games_recorded || 0),
        total_games: Number(t.total_games || 0)
      }))
    };

    // 3. Games metrics
    const [gameStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM game) AS total_games,
        (SELECT COUNT(*) FROM result) AS finished_games,
        (SELECT COUNT(*) FROM result WHERE outcome = 'WHITE') AS white_wins,
        (SELECT COUNT(*) FROM result WHERE outcome = 'DRAW') AS draws,
        (SELECT COUNT(*) FROM result WHERE outcome = 'BLACK') AS black_wins,
        (SELECT COUNT(*) FROM result WHERE is_upset = 1) AS total_upsets
    `);
    const gs = gameStats[0] || {};

    const [dailyRows] = await pool.query(`
      SELECT DATE(recorded_at) as game_date, COUNT(*) as count
      FROM result
      WHERE recorded_at >= CURDATE() - INTERVAL 13 DAY
      GROUP BY DATE(recorded_at)
      ORDER BY game_date ASC
    `);
    const dailyMap = new Map(dailyRows.map(r => [r.game_date, Number(r.count)]));
    const daily_14d = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daily_14d.push({
        date: dateStr,
        label,
        count: dailyMap.get(dateStr) || 0
      });
    }

    const games = {
      total: Number(gs.total_games || 0),
      finished: Number(gs.finished_games || 0),
      outcomes: {
        white: Number(gs.white_wins || 0),
        draw: Number(gs.draws || 0),
        black: Number(gs.black_wins || 0)
      },
      total_upsets: Number(gs.total_upsets || 0),
      games_per_day_14d: daily_14d
    };

    // 4. Rating distribution
    const [bandRows] = await pool.query(`
      SELECT 
        FLOOR(current_rating / 100) * 100 AS min_rating,
        COUNT(*) AS count
      FROM player
      GROUP BY min_rating
      ORDER BY min_rating ASC
    `);
    const [ratingSummary] = await pool.query(`
      SELECT ROUND(AVG(current_rating)) as avg_rating, MAX(current_rating) as max_rating, MIN(current_rating) as min_rating
      FROM player
    `);
    const rating_distribution = {
      bands: bandRows.map(b => ({
        band: `${b.min_rating}-${Number(b.min_rating) + 99}`,
        range: `${b.min_rating}-${Number(b.min_rating) + 99}`,
        min: Number(b.min_rating),
        max: Number(b.min_rating) + 99,
        count: Number(b.count)
      })),
      avg_rating: Number(ratingSummary[0]?.avg_rating || 0),
      max_rating: Number(ratingSummary[0]?.max_rating || 0),
      min_rating: Number(ratingSummary[0]?.min_rating || 0)
    };

    // 5. Top players
    const [topPlayersRows] = await pool.query(`
      SELECT 
        p.player_id, p.name, p.country, p.country_code, p.current_rating, p.club,
        (
          SELECT rh.rating_change 
          FROM rating_history rh 
          WHERE rh.player_id = p.player_id 
          ORDER BY rh.recorded_at DESC, rh.history_id DESC 
          LIMIT 1
        ) AS last_rating_change
      FROM player p
      ORDER BY p.current_rating DESC
      LIMIT 5
    `);
    const top_players = topPlayersRows.map(p => ({
      player_id: p.player_id,
      name: p.name,
      country: p.country,
      country_code: p.country_code,
      current_rating: Number(p.current_rating),
      club: p.club,
      last_rating_change: p.last_rating_change !== null ? Number(p.last_rating_change) : null
    }));

    // 6. Recent upsets
    const [upsetRows] = await pool.query(`
      SELECT 
        u.tournament_id, t.name AS tournament_name, u.game_id, u.winner, u.winner_rating, u.loser, u.loser_rating, u.rating_gap, r.recorded_at
      FROM v_upsets u
      JOIN tournament t ON t.tournament_id = u.tournament_id
      JOIN result r ON r.game_id = u.game_id
      ORDER BY r.recorded_at DESC, u.game_id DESC
      LIMIT 5
    `);
    const recent_upsets = upsetRows.map(u => ({
      tournament_id: u.tournament_id,
      tournament_name: u.tournament_name,
      game_id: u.game_id,
      winner: u.winner,
      winner_rating: Number(u.winner_rating),
      loser: u.loser,
      loser_rating: Number(u.loser_rating),
      rating_gap: Number(u.rating_gap),
      recorded_at: u.recorded_at
    }));

    // 7. Recent audit logs
    const [auditRows] = await pool.query(`
      SELECT 
        a.log_id, a.actor_user_id, COALESCE(u.full_name, u.username, 'System') AS actor_name,
        u.email AS actor_email, a.action, a.entity, a.entity_id, a.details, a.created_at
      FROM audit_log a
      LEFT JOIN app_user u ON u.user_id = a.actor_user_id
      ORDER BY a.created_at DESC, a.log_id DESC
      LIMIT 8
    `);
    const recent_audit = auditRows.map(a => ({
      log_id: a.log_id,
      actor_user_id: a.actor_user_id,
      actor: a.actor_name,
      action: a.action,
      entity: a.entity,
      entity_id: a.entity_id,
      details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details,
      created_at: a.created_at,
      time: a.created_at
    }));

    // 8. System status
    const [latestPredRows] = await pool.query(`
      SELECT created_at, model_version 
      FROM prediction 
      ORDER BY created_at DESC, prediction_id DESC 
      LIMIT 1
    `);
    const system = {
      database_reachable: true,
      api_uptime: Math.floor(process.uptime()),
      api_uptime_seconds: Math.floor(process.uptime()),
      server_time: new Date().toISOString(),
      latest_prediction: latestPredRows.length > 0 ? {
        created_at: latestPredRows[0].created_at,
        model_version: latestPredRows[0].model_version
      } : null
    };

    return res.status(200).json({
      users,
      tournaments,
      games,
      rating_distribution,
      top_players,
      recent_upsets,
      recent_audit,
      system
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/system/db-status
 * Diagnostics facts for running server process (ADMIN only).
 * Omits host, user, and password. Audit-logs nothing.
 */
export const getDbStatus = async (req, res, next) => {
  try {
    const facts = await getDbDiagnosticFacts({ includeConnectionDetails: false });
    return res.status(200).json(facts);
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
  getAuditLogs,
  getAdminOverview,
  getDbStatus
};
