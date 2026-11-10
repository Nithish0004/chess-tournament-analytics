import { pool } from '../config/db.js';

/**
 * Gathers complete database diagnostics facts.
 *
 * @param {Object} options
 * @param {boolean} [options.includeConnectionDetails=false] - If true, includes host/port/env DB name (for CLI scripts only)
 * @returns {Promise<Object>}
 */
export const getDbDiagnosticFacts = async ({ includeConnectionDetails = false } = {}) => {
  // 1. Connection info & Version
  const [dbRows] = await pool.query('SELECT DATABASE() AS current_database, VERSION() AS mysql_version');
  const currentDatabase = dbRows[0]?.current_database || null;
  const mysqlVersion = dbRows[0]?.mysql_version || null;

  // 2. Schema element checks
  const targetTables = ['app_user', 'audit_log', 'game_prediction', 'player', 'tournament', 'game', 'result'];
  const [tableRows] = await pool.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (?, ?, ?, ?, ?, ?, ?)`,
    targetTables
  );
  const existingTables = new Set(tableRows.map((r) => r.TABLE_NAME));

  const [columnRows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND (
         (TABLE_NAME = 'app_user' AND COLUMN_NAME IN ('approval_status', 'username'))
         OR
         (TABLE_NAME = 'player' AND COLUMN_NAME = 'country_code')
       )`
  );
  const existingColumns = new Set(columnRows.map((r) => `${r.TABLE_NAME}.${r.COLUMN_NAME}`));

  const [triggerRows] = await pool.query(
    `SELECT TRIGGER_NAME
     FROM INFORMATION_SCHEMA.TRIGGERS
     WHERE TRIGGER_SCHEMA = DATABASE()
       AND TRIGGER_NAME = 'trg_tournament_bu'`
  );
  const hasTrigger = triggerRows.length > 0;

  const schemaChecks = {
    'table app_user': existingTables.has('app_user'),
    'table audit_log': existingTables.has('audit_log'),
    'table game_prediction': existingTables.has('game_prediction'),
    'column app_user.approval_status': existingColumns.has('app_user.approval_status'),
    'column app_user.username': existingColumns.has('app_user.username'),
    'column player.country_code': existingColumns.has('player.country_code'),
    'trigger trg_tournament_bu': hasTrigger
  };

  const schemaType = schemaChecks['column app_user.approval_status'] ? 'new' : 'old';

  // 3. Row counts for tables (print "missing table" if table does not exist)
  const countTables = ['player', 'app_user', 'tournament', 'game', 'result', 'audit_log'];
  const rowCounts = {};

  for (const table of countTables) {
    if (!existingTables.has(table)) {
      rowCounts[table] = 'missing table';
    } else {
      try {
        const [cntRows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
        rowCounts[table] = Number(cntRows[0]?.total || 0);
      } catch (err) {
        rowCounts[table] = 'missing table';
      }
    }
  }

  // 4. Newest records
  let newestAppUserCreatedAt = null;
  if (existingTables.has('app_user')) {
    try {
      const [userMax] = await pool.query('SELECT MAX(created_at) AS newest FROM app_user');
      newestAppUserCreatedAt = userMax[0]?.newest || null;
    } catch {
      newestAppUserCreatedAt = 'missing table';
    }
  } else {
    newestAppUserCreatedAt = 'missing table';
  }

  let newestAuditLogRow = null;
  if (existingTables.has('audit_log')) {
    try {
      const [auditMax] = await pool.query(
        'SELECT log_id, actor_user_id, action, entity, entity_id, details, created_at FROM audit_log ORDER BY log_id DESC LIMIT 1'
      );
      newestAuditLogRow = auditMax[0] || null;
    } catch {
      newestAuditLogRow = 'missing table';
    }
  } else {
    newestAuditLogRow = 'missing table';
  }

  const result = {
    database: currentDatabase,
    mysql_version: mysqlVersion,
    schema: {
      type: schemaType,
      checks: schemaChecks
    },
    row_counts: rowCounts,
    newest_records: {
      app_user_newest_created_at: newestAppUserCreatedAt,
      audit_log_newest: newestAuditLogRow
    }
  };

  if (includeConnectionDetails) {
    result.connection = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      db_name_env: process.env.DB_NAME || ''
    };
  }

  return result;
};

export default {
  getDbDiagnosticFacts
};
