import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

const positiveInt = (v: unknown, fallback: number, max: number) => {
  const n = Number.parseInt(typeof v === 'string' ? v : '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

@Controller('kpis')
export class BelowMinimumController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * K5: artigos com `current_stock < min_required` no snapshot de referência; exclui R11 (min > max) do universo.
   * Aceita os filtros globais; `itemsWithoutData` = artigos sem snapshots no período (fora dos KPI, nunca zero).
   */
  @Get('below-minimum')
  async belowMinimum(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const n = q.params.length;
    const page = positiveInt(query.page, 1, 1_000_000);
    const pageSize = positiveInt(query.pageSize, 50, 500);

    const totals = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT (SELECT count(*)::int FROM no_data) AS without_data,
              count(*) FILTER (WHERE NOT flag_min_above_max)::int AS eligible,
              count(*) FILTER (WHERE flag_min_above_max)::int AS excluded,
              count(*) FILTER (WHERE NOT flag_min_above_max AND current_stock < min_required)::int AS below
         FROM ref`,
      q.params,
    )).rows[0];

    const rows = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT item_id, item_name, current_stock, min_required, to_char(ref_date, 'YYYY-MM-DD') AS ref_date, stale
         FROM ref
        WHERE NOT flag_min_above_max AND current_stock < min_required
        ORDER BY ref_date, item_id, item_name
        LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...q.params, pageSize, (page - 1) * pageSize],
    )).rows;

    return {
      count: totals.below as number,
      eligible: totals.eligible as number,
      excluded: totals.excluded as number,
      pct: pct(totals.below, totals.eligible),
      itemsWithoutData: totals.without_data as number,
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
