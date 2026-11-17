import { join } from 'node:path';
import { Pool } from 'pg';
import { startEmbeddedPg } from './embedded-pg';

/** Postgres de desenvolvimento (embedded, persistente em apps/backend/.pgdata). Ctrl+C para parar. */
async function main() {
  const port = Number(process.env.DEV_DB_PORT ?? 54329);
  const pg = await startEmbeddedPg({ dataDir: join(__dirname, '..', '.pgdata'), port });
  const admin = new Pool({ connectionString: pg.adminUrl });
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'stock'");
  if (exists.rowCount === 0) await admin.query('CREATE DATABASE stock');
  await admin.end();
  console.log(`PostgreSQL pronto. DATABASE_URL=postgres://postgres:postgres@localhost:${port}/stock`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
