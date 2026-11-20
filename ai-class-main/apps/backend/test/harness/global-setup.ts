import { startEmbeddedPg } from '../../scripts/embedded-pg';

/** Arranca UMA instância de Postgres para toda a execução de testes. Cada teste cria a sua própria base (ver test-app.ts). */
export default async function globalSetup() {
  const pg = await startEmbeddedPg();
  process.env.TEST_PG_ADMIN_URL = pg.adminUrl;
  (globalThis as any).__TEST_PG__ = pg;
}
