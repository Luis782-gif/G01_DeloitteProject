import { mkdtempSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export interface EmbeddedPg {
  adminUrl: string;
  port: number;
  stop(): Promise<void>;
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Arranca um PostgreSQL embedded (binários vindos do npm, sem instalação).
 * Sem `dataDir` usa uma pasta temporária descartada no fim (testes).
 * Com `dataDir` os dados persistem entre arranques (desenvolvimento).
 */
export async function startEmbeddedPg(opts: { dataDir?: string; port?: number } = {}): Promise<EmbeddedPg> {
  const port = opts.port ?? (await freePort());
  const persistent = opts.dataDir !== undefined;
  const databaseDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'stock-pg-'));
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent,
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(join(databaseDir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  return {
    port,
    adminUrl: `postgres://postgres:postgres@localhost:${port}/postgres`,
    stop: () => pg.stop(),
  };
}
