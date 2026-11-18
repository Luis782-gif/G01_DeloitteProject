import { mkdtempSync, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
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
 * No Windows, logo após parar o Postgres, ficheiros da pasta de dados podem estar ainda bloqueados (EBUSY/EPERM).
 * Tenta com pausas; se continuar bloqueada, é só lixo temporário: avisa e segue (o resto dos erros propaga-se).
 */
async function removeTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'EBUSY' && code !== 'EPERM') throw err;
    console.warn(`Aviso: não foi possível apagar a pasta temporária ${dir} (${code}); pode ser apagada à mão.`);
  }
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
    // A limpeza da pasta temporária é feita aqui (tolerante a EBUSY/EPERM no Windows), não pela biblioteca.
    persistent: true,
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(join(databaseDir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  return {
    port,
    adminUrl: `postgres://postgres:postgres@localhost:${port}/postgres`,
    async stop() {
      await pg.stop(); // falhas ao parar o servidor propagam-se
      if (!persistent) await removeTempDir(databaseDir);
    },
  };
}
