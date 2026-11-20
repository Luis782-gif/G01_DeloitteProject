import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createApp } from '../../src/create-app';
import { migrate } from '../../src/db/migrate';
import { loadCsvFolder } from '../../src/etl/load-csv-folder';

/** Pasta de fixtures CSV: `fixture('f1')` -> apps/backend/test/fixtures/f1 */
export const fixture = (name: string) => join(__dirname, '..', 'fixtures', name);

export interface TestApp {
  app: INestApplication;
  /** supertest sobre a API HTTP real: `api.get('/api/...')`. */
  api: ReturnType<typeof request>;
  /** Acesso direto à base de teste (para preparar/inspecionar dados). */
  pool: Pool;
  databaseUrl: string;
  close(): Promise<void>;
}

/** Apps criadas dentro de um teste e ainda abertas (ver a rede de segurança no fim do ficheiro). */
const open = new Set<TestApp>();
let inTest = false;

/**
 * Seam principal dos testes: base de dados nova e isolada (migrada), opcionalmente carregada
 * a partir de uma pasta de CSV de teste, com a API HTTP real por cima.
 *
 *   const t = await createTestApp({ csvDir: fixture('f1') });
 *   const res = await t.api.get('/api/health').expect(200);
 *   await t.close();
 */
export async function createTestApp(opts: { csvDir?: string } = {}): Promise<TestApp> {
  const adminUrl = process.env.TEST_PG_ADMIN_URL;
  if (!adminUrl) throw new Error('TEST_PG_ADMIN_URL em falta: corra os testes com `npm test` (jest globalSetup).');

  const dbName = `test_${randomBytes(6).toString('hex')}`;
  const admin = new Pool({ connectionString: adminUrl });
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();

  const u = new URL(adminUrl);
  u.pathname = `/${dbName}`;
  const databaseUrl = u.toString();

  const pool = new Pool({ connectionString: databaseUrl });
  await migrate(pool);
  if (opts.csvDir) await loadCsvFolder(pool, opts.csvDir);

  const app = await createApp(databaseUrl);
  await app.init();

  let closed = false;
  const handle: TestApp = {
    app,
    api: request(app.getHttpServer()),
    pool,
    databaseUrl,
    async close() {
      if (closed) return;
      closed = true;
      open.delete(handle);
      await app.close();
      await pool.end();
      const a = new Pool({ connectionString: adminUrl });
      await a.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await a.end();
    },
  };
  if (inTest) open.add(handle); // apps de beforeAll ficam a cargo do afterAll do próprio suite
  return handle;
}

/**
 * Rede de segurança: um teste que crie mais de uma app (ou que reatribua `t`) deixaria Pools e servidores
 * abertos e o Jest ficaria pendurado no fim da execução. Fecha tudo o que ficou aberto após cada teste.
 */
beforeEach(() => {
  inTest = true;
});
afterEach(async () => {
  for (const t of [...open]) await t.close();
  inTest = false;
});
