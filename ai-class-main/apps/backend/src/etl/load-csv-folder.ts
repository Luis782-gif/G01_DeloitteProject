import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool } from 'pg';

export const CSV_FILES = [
  'inventory_data.csv',
  'vendor_data.csv',
  'financial_data.csv',
  'patient_data.csv',
  'staff_data.csv',
] as const;

/**
 * PLACEHOLDER do carregamento (o ETL verdadeiro é o ticket #4).
 * Só conta as linhas de dados dos CSV presentes na pasta e regista uma execução em `etl_run`.
 * O ticket #4 substitui o corpo mantendo a assinatura: (pool, pasta) => Promise<{ runId }>.
 */
export async function loadCsvFolder(pool: Pool, dir: string): Promise<{ runId: number; rowsRead: number }> {
  let rowsRead = 0;
  for (const file of CSV_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
    rowsRead += Math.max(lines.length - 1, 0);
  }
  const { rows } = await pool.query(
    'INSERT INTO etl_run (finished_at, rows_read) VALUES (now(), $1) RETURNING run_id',
    [rowsRead],
  );
  return { runId: rows[0].run_id, rowsRead };
}
