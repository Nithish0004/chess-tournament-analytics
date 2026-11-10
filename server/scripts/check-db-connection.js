import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';
import { getDbDiagnosticFacts } from '../src/services/dbDiagnostic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env exactly as the server does
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runDiagnostic = async () => {
  console.log('======================================================================');
  console.log('--- Database Connection & Schema Diagnostic ---');
  console.log('======================================================================\n');

  try {
    const facts = await getDbDiagnosticFacts({ includeConnectionDetails: true });

    // 1. Connection & Database Table
    console.log('1. Connection & Environment Details:');
    console.table([
      { Property: 'Host', Value: facts.connection.host },
      { Property: 'Port', Value: facts.connection.port },
      { Property: 'DB_NAME (from .env)', Value: facts.connection.db_name_env },
      { Property: 'SELECT DATABASE()', Value: facts.database },
      { Property: 'MySQL Version', Value: facts.mysql_version },
      { Property: 'Schema Classification', Value: facts.schema.type.toUpperCase() }
    ]);

    // 2. Schema Existence Checks
    console.log('\n2. Schema Element Verification:');
    const schemaTable = Object.entries(facts.schema.checks).map(([element, exists]) => ({
      'Schema Element': element,
      'Status': exists ? '✅ Present' : '❌ Missing'
    }));
    console.table(schemaTable);

    // 3. Table Row Counts
    console.log('\n3. Table Row Counts:');
    const rowCountTable = Object.entries(facts.row_counts).map(([table, count]) => ({
      'Table': table,
      'Row Count': typeof count === 'number' ? count.toLocaleString() : count
    }));
    console.table(rowCountTable);

    // 4. Newest Records
    console.log('\n4. Newest Database Records:');
    console.log(`- Newest app_user created_at: ${facts.newest_records.app_user_newest_created_at || 'None'}`);
    if (facts.newest_records.audit_log_newest && typeof facts.newest_records.audit_log_newest === 'object') {
      const a = facts.newest_records.audit_log_newest;
      console.log(`- Newest audit_log row: [ID: ${a.log_id}] Action: ${a.action} | Entity: ${a.entity} | Time: ${a.created_at}`);
    } else {
      console.log(`- Newest audit_log row: ${facts.newest_records.audit_log_newest || 'None'}`);
    }

    // 5. Write Round-Trip
    console.log('\n5. Write Round-Trip (Transactional):');
    if (!facts.schema.checks['table audit_log']) {
      console.log('old schema: write test skipped');
    } else {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [insertResult] = await conn.query(
          `INSERT INTO audit_log (action, entity, details)
           VALUES ('DB_CONNECTION_TEST', 'DIAGNOSTIC', JSON_OBJECT('diagnostic_test', true, 'timestamp', NOW()))`
        );
        const testLogId = insertResult.insertId;

        const [selectRows] = await conn.query(
          'SELECT log_id, action, entity, details, created_at FROM audit_log WHERE log_id = ?',
          [testLogId]
        );

        const writeSuccessful = selectRows.length === 1 && selectRows[0].action === 'DB_CONNECTION_TEST';

        await conn.rollback();

        // Verify that rollback discarded the write and nothing was kept
        const [verifyRows] = await pool.query(
          'SELECT COUNT(*) AS cnt FROM audit_log WHERE log_id = ?',
          [testLogId]
        );
        const nothingKept = verifyRows[0]?.cnt === 0;

        if (writeSuccessful && nothingKept) {
          console.log(`✅ Write round-trip successful: inserted test log_id ${testLogId}, verified read within transaction, rolled back, and confirmed nothing was kept.`);
        } else {
          console.error(`❌ Write round-trip anomaly: writeSuccessful=${writeSuccessful}, nothingKept=${nothingKept}`);
        }
      } catch (err) {
        await conn.rollback().catch(() => {});
        console.error('❌ Write round-trip error:', err.message);
      } finally {
        conn.release();
      }
    }

    console.log('\n======================================================================');
    console.log('Database diagnostic completed successfully.');
    console.log('======================================================================');
  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    await pool.end();
  }
};

runDiagnostic();
