import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

const num = (v: unknown, digits: number): number | null => {
  if (v === null || v === undefined) return null;
  const f = 10 ** digits;
  return Math.round(Number(v) * f) / f;
};

/** Agregados de LT: média, desvio-padrão populacional e coeficiente de variação (desvio / média). */
const STATS = `count(*)::int AS n,
               avg(restock_lead_time_days) AS mean,
               stddev_pop(restock_lead_time_days) AS sd,
               stddev_pop(restock_lead_time_days) / NULLIF(avg(restock_lead_time_days), 0) AS cv`;

const stats = (r: any) => ({
  mean: num(r.mean, 2),
  stdDev: num(r.sd, 2),
  cv: num(r.cv, 3),
  observations: r.n as number,
});

@Controller('kpis')
export class LeadTimeController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * K3: tempo médio de reposição = média de `restock_lead_time_days` dos snapshots do período (filtrados).
   * Desvio-padrão populacional. LT <= 0 (R12) fica fora do KPI e é contado em `invalid`.
   */
  @Get('lead-time')
  async leadTime(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const valid = `restock_lead_time_days > 0`;

    const total = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT ${STATS},
              (SELECT count(*)::int FROM snaps WHERE NOT (${valid})) AS invalid,
              (SELECT count(*)::int FROM no_data) AS without_data
         FROM snaps WHERE ${valid}`,
      q.params,
    )).rows[0];

    const vendors = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT s.vendor_id, v.vendor_name, ${STATS.replace(/restock_lead_time_days/g, 's.restock_lead_time_days')}
         FROM snaps s JOIN dim_vendor v ON v.vendor_id = s.vendor_id
        WHERE s.${valid}
        GROUP BY s.vendor_id, v.vendor_name ORDER BY s.vendor_id`,
      q.params,
    )).rows;

    const items = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT item_id, item_name, ${STATS}
         FROM snaps WHERE ${valid}
        GROUP BY item_id, item_name ORDER BY item_id, item_name`,
      q.params,
    )).rows;

    return {
      ...stats(total),
      invalid: total.invalid as number,
      itemsWithoutData: total.without_data as number,
      byVendor: vendors.map((r) => ({ vendorId: r.vendor_id as string, vendorName: r.vendor_name as string, ...stats(r) })),
      byItem: items.map((r) => ({ itemRef: itemRef(r.item_id, r.item_name), name: r.item_name as string, ...stats(r) })),
    };
  }
}
