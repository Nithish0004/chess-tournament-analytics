import { pool } from '../config/db.js';

/**
 * Inserts a record into the audit_log table.
 *
 * @param {Object} entry
 * @param {number|null} entry.actor_user_id - User ID of the actor performing the action
 * @param {string} entry.action - Action name (e.g. CREATE, UPDATE, START, COMPLETE, REGISTER, RECORD_RESULT, REJECT_RATING_EDIT)
 * @param {string} entry.entity - Target entity type (e.g. TOURNAMENT, PLAYER, ROUND, GAME, REGISTRATION, USER)
 * @param {number|null} entry.entity_id - ID of the target entity
 * @param {Object|null} entry.details - JSON-serializable details payload
 * @param {Object} [connection=pool] - Optional database connection or pool to execute within
 */
export const logAudit = async ({
  actor_user_id = null,
  action,
  entity,
  entity_id = null,
  details = null
}, connection = pool) => {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    await connection.query(
      `INSERT INTO audit_log (actor_user_id, action, entity, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [actor_user_id, action, entity, entity_id, detailsJson]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

export default logAudit;
