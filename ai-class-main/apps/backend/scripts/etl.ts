import { Pool } from 'pg';
import { loadConfig } from '../src/config';
import { migrate } from '../src/db/migrate';
import { loadCsvFolder } from '../src/etl/load-csv-folder';

/** Refresh do ETL: `npm run etl` (usa DATABASE_URL e DATA_DIR). Idempotente; nunca altera os CSV. */
async function main() {
  const config = loadConfig();
  const dir = process.argv[2] ?? config.dataDir;
  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    await migrate(pool);
    const r = await loadCsvFolder(pool, dir);
    console.log(
      `ETL #${r.runId} (${dir}): lidos ${r.rowsRead}, carregados ${r.rowsLoaded}, assinalados ${r.rowsFlagged}, rejeitados ${r.rowsRejected}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
