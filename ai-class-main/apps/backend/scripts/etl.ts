import { isAbsolute, resolve } from 'node:path';
import { Pool } from 'pg';
import { loadConfig } from '../src/config';
import { migrate } from '../src/db/migrate';
import { loadCsvFolder } from '../src/etl/load-csv-folder';

/** Refresh do ETL: `npm run etl` (usa DATABASE_URL e DATA_DIR). Idempotente; nunca altera os CSV. */
async function main() {
  const config = loadConfig();
  // DATA_DIR relativo resolve-se a partir da raiz do repositório (onde está o .env),
  // não de apps/backend, onde o npm corre o script. Um argumento explícito resolve-se a partir do cwd.
  const repoRoot = resolve(__dirname, '../../..');
  const arg = process.argv[2];
  const dir = arg ? resolve(arg) : isAbsolute(config.dataDir) ? config.dataDir : resolve(repoRoot, config.dataDir);
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
