import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { signToken } from '../utils/jwt.js';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT admin_id, username, password_hash, role FROM admin_user WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({
      admin_id: admin.admin_id,
      username: admin.username,
      role: admin.role
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
};
