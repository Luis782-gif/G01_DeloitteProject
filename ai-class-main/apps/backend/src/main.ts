import 'reflect-metadata';
import { Pool } from 'pg';
import { loadConfig } from './config';
import { createApp } from './create-app';
import { migrate } from './db/migrate';

async function bootstrap() {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const applied = await migrate(pool);
  await pool.end();
  if (applied.length) console.log(`Migrações aplicadas: ${applied.join(', ')}`);

  const app = await createApp(config.databaseUrl);
  await app.listen(config.port);
  console.log(`API em http://localhost:${config.port}/api`);
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
