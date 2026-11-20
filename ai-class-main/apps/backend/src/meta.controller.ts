import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from './db/database.module';

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

@Controller('meta')
export class MetaController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Qualidade dos dados da última execução do ETL (rodapé da aplicação). */
  @Get('data-quality')
  async dataQuality() {
    const run = (await this.pool.query(
      'SELECT run_id, finished_at FROM etl_run WHERE finished_at IS NOT NULL ORDER BY run_id DESC LIMIT 1',
    )).rows[0];
    if (!run) {
      return {
        lastRefreshAt: null,
        total: { read: 0, treated: 0, flagged: 0, rejected: 0, pctTreated: 0, pctFlagged: 0, pctRejected: 0 },
        byFile: [],
      };
    }
    const files = (await this.pool.query(
      `SELECT source_file, rows_read, rows_flagged, rows_rejected FROM etl_run_file
        WHERE run_id = $1 ORDER BY source_file`,
      [run.run_id],
    )).rows;
    const byFile = files.map((f) => ({
      file: f.source_file as string,
      read: f.rows_read as number,
      flagged: f.rows_flagged as number,
      rejected: f.rows_rejected as number,
    }));
    const read = byFile.reduce((s, f) => s + f.read, 0);
    const flagged = byFile.reduce((s, f) => s + f.flagged, 0);
    const rejected = byFile.reduce((s, f) => s + f.rejected, 0);
    const treated = read - flagged - rejected;
    return {
      lastRefreshAt: (run.finished_at as Date).toISOString(),
      total: {
        read, treated, flagged, rejected,
        pctTreated: pct(treated, read), pctFlagged: pct(flagged, read), pctRejected: pct(rejected, read),
      },
      byFile,
    };
  }
}
