import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { itemRef, referenceSnapshotsSql } from './reference-snapshot';

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

const positiveInt = (v: string | undefined, fallback: number, max: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

@Controller('kpis')
export class BelowMinimumController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** K5: artigos com `current_stock < min_required` no snapshot de referência; exclui R11 (min > max) do universo. */
  @Get('below-minimum')
  async belowMinimum(@Query('page') pageQ?: string, @Query('pageSize') sizeQ?: string) {
    const page = positiveInt(pageQ, 1, 1_000_000);
    const pageSize = positiveInt(sizeQ, 50, 500);

    const totals = (await this.pool.query(
      `WITH ref AS (${referenceSnapshotsSql()})
       SELECT count(*) FILTER (WHERE NOT flag_min_above_max)::int AS eligible,
              count(*) FILTER (WHERE flag_min_above_max)::int AS excluded,
              count(*) FILTER (WHERE NOT flag_min_above_max AND current_stock < min_required)::int AS below
         FROM ref`,
    )).rows[0];

    const rows = (await this.pool.query(
      `WITH ref AS (${referenceSnapshotsSql()})
       SELECT item_id, item_name, current_stock, min_required, to_char(ref_date, 'YYYY-MM-DD') AS ref_date, stale
         FROM ref
        WHERE NOT flag_min_above_max AND current_stock < min_required
        ORDER BY ref_date, item_id, item_name
        LIMIT $1 OFFSET $2`,
      [pageSize, (page - 1) * pageSize],
    )).rows;

    return {
      count: totals.below as number,
      eligible: totals.eligible as number,
      excluded: totals.excluded as number,
      pct: pct(totals.below, totals.eligible),
      items: rows.map((r) => ({
        itemRef: itemRef(r.item_id, r.item_name),
        name: r.item_name as string,
        stock: r.current_stock as number,
        min: r.min_required as number,
        referenceDate: r.ref_date as string,
        stale: r.stale as boolean,
      })),
    };
  }
}
