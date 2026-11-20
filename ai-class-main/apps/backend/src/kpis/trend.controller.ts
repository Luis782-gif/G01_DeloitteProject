import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';

/**
 * Por métrica: expressão agregada e predicado dos snapshots que contam para o valor do mês.
 *  - below_min_pct: "% de registos abaixo do mínimo no mês" (snapshots do mês, não o snapshot de
 *    referência do cartão); R11 (mínimo > máximo) fica fora.
 *  - lead_time: média do tempo de reposição; LT <= 0 (R12) fora.
 */
const METRICS = {
  below_min_pct: {
    where: 'NOT flag_min_above_max',
    value: `100.0 * count(*) FILTER (WHERE current_stock < min_required) / NULLIF(count(*), 0)`,
    digits: 1,
  },
  lead_time: {
    where: 'restock_lead_time_days > 0',
    value: 'avg(restock_lead_time_days)',
    digits: 2,
  },
} as const;

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

@Controller('kpis')
export class TrendController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Tendência mensal: `[{ month, value, previousValue, delta, snapshots }]`, um por mês do período.
   * Mês sem snapshots (elegíveis) => `value` nulo (lacuna): nunca zero nem valor carregado.
   * `previousValue` é o valor do mês civil anterior; `delta` = value - previousValue (nulo se faltar um).
   */
  @Get('trend')
  async trend(@Query() query: Record<string, unknown>) {
    const m = METRICS[query.metric as keyof typeof METRICS];
    if (!Object.hasOwn(METRICS, String(query.metric))) {
      throw new BadRequestException({ error: 'metric deve ser below_min_pct ou lead_time', field: 'metric' });
    }
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const rows = (await this.pool.query(
      `WITH ${q.ctes},
       months AS (
         SELECT to_char(g, 'YYYY-MM') AS month, g AS start
           FROM bounds b, generate_series(date_trunc('month', b.from_date), date_trunc('month', b.to_date), interval '1 month') g
          WHERE EXISTS (SELECT 1 FROM snaps)),
       agg AS (
         SELECT to_char(snap_date, 'YYYY-MM') AS month, count(*)::int AS n, ${m.value} AS value
           FROM snaps WHERE ${m.where} GROUP BY 1)
       SELECT months.month, agg.value, COALESCE(agg.n, 0) AS n FROM months LEFT JOIN agg USING (month) ORDER BY months.month`,
      q.params,
    )).rows;
    const values = rows.map((r) => (r.value === null ? null : round(Number(r.value), m.digits)));
    return rows.map((r, i) => {
      const value = values[i];
      const previousValue = i > 0 ? values[i - 1] : null;
      return {
        month: r.month as string,
        value,
        previousValue,
        delta: value !== null && previousValue !== null ? round(value - previousValue, m.digits) : null,
        snapshots: r.n as number,
      };
    });
  }
}
