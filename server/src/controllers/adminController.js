import { pool } from '../config/db.js';
import { sendAccountApprovedEmail } from '../services/mailService.js';

export const getUsers = async (req, res, next) => {
  const { status, role } = req.query;

  try {
    let sql = `
      SELECT user_id, email, full_name, role, status, email_verified,
             phone, organization, player_id, failed_logins, locked_until,
             last_login_at, created_at
      FROM app_user
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

export const approveOrganizer = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, role, status FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    if (user.role !== 'ORGANIZER' || user.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        error: 'Only organizers in PENDING_APPROVAL status can be approved'
      });
    }

    await pool.query(
      "UPDATE app_user SET status = 'ACTIVE' WHERE user_id = ?",
      [id]
    );

    // Send notification email
    await sendAccountApprovedEmail(user.email, user.full_name);

    return res.status(200).json({
      message: 'Organizer account approved successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  const { id } = req.params;

  if (Number(id) === Number(req.user.user_id)) {
    return res.status(400).json({
      error: 'An admin cannot suspend themselves'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, role, status FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      "UPDATE app_user SET status = 'SUSPENDED' WHERE user_id = ?",
      [id]
    );

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
      'SELECT user_id, role, status FROM app_user WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      "UPDATE app_user SET status = 'ACTIVE' WHERE user_id = ?",
      [id]
    );

    return res.status(200).json({
      message: 'User reactivated successfully'
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getUsers,
  approveOrganizer,
  suspendUser,
  reactivateUser
};
