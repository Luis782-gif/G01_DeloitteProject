import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { autonomyDays, slackDays } from './autonomy';
import { itemRef } from './reference-snapshot';

const round = (v: unknown, digits: number): number | null => {
  if (v === null || v === undefined) return null;
  const f = 10 ** digits;
  return Math.round(Number(v) * f) / f;
};

/**
 * Drill-through (spec 8.5 e 11): detalhe de um artigo ou de um fornecedor.
 * Aceitam os filtros globais (o período limita o histórico/estatísticas); o artigo/fornecedor vem do caminho.
 */
@Controller()
export class DetailController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('items/:itemRef')
  async item(@Param('itemRef') ref: string, @Query() query: Record<string, unknown>) {
    const m = ref.match(/^(\d+):(.+)$/);
    const found = m
      ? (await this.pool.query('SELECT item_sk, item_id, item_name FROM dim_item WHERE item_id = $1', [Number(m[1])])).rows.find(
          (r) => itemRef(r.item_id, r.item_name) === ref,
        )
      : undefined;
    if (!found) throw new NotFoundException({ error: `Artigo desconhecido: "${ref}"` });

    const { artigo: _ignored, ...rest } = query;
    const filters = await resolveFilters(this.pool, rest);
    filters.itemSk = found.item_sk;
    const q = filteredSnapshots(filters);

    const history = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT to_char(snap_date, 'YYYY-MM-DD') AS date, current_stock, min_required, max_capacity, avg_usage_per_day,
              restock_lead_time_days, unit_cost::float8 AS unit_cost, vendor_id
         FROM snaps ORDER BY snap_date`,
      q.params,
    )).rows;
    const ref0 = (await this.pool.query(
      `WITH ${q.ctes} SELECT to_char(ref_date, 'YYYY-MM-DD') AS date, stale FROM ref`,
      q.params,
    )).rows[0];
    const abc = (await this.pool.query(`WITH ${q.ctes} SELECT class FROM abc WHERE item_sk = $${q.params.length + 1}`, [...q.params, found.item_sk])).rows[0];

    const rows = history.map((r) => ({
      date: r.date as string,
      stock: r.current_stock as number,
      min: r.min_required as number,
      max: r.max_capacity as number,
      autonomyDays: round(autonomyDays(r.current_stock, r.avg_usage_per_day), 2),
      leadTimeDays: r.restock_lead_time_days as number,
      unitCost: r.unit_cost as number,
      vendorId: r.vendor_id as string,
    }));
    const last = history[history.length - 1];
    const aut = last ? autonomyDays(last.current_stock, last.avg_usage_per_day) : null;
    const slack = last ? slackDays(aut, last.restock_lead_time_days) : null;

    return {
      itemRef: ref,
      itemId: found.item_id as number,
      name: found.item_name as string,
      abcClass: (abc?.class as string | undefined) ?? null,
      stale: ref0 ? (ref0.stale as boolean) : false,
      reference: last
        ? { ...rows[rows.length - 1], slackDays: round(slack, 2), stale: ref0.stale as boolean }
        : null,
      history: rows,
      itemsWithoutData: history.length === 0 ? 1 : 0,
    };
  }

  @Get('vendors/:vendorId')
  async vendor(@Param('vendorId') vendorId: string, @Query() query: Record<string, unknown>) {
    const v = (await this.pool.query(
      `SELECT vendor_id, vendor_name, item_supplied, declared_lead_time_days,
              to_char(last_order_date, 'YYYY-MM-DD') AS last_order_date, to_char(next_delivery_date, 'YYYY-MM-DD') AS next_delivery_date,
              (next_delivery_date - last_order_date)::int AS dates_lt
         FROM dim_vendor WHERE vendor_id = $1`,
      [vendorId],
    )).rows[0];
    if (!v) throw new NotFoundException({ error: `Fornecedor desconhecido: "${vendorId}"` });

    const { fornecedor: _ignored, ...rest } = query;
    const filters = await resolveFilters(this.pool, rest);
    filters.vendorId = vendorId;
    const q = filteredSnapshots(filters);
    const s = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT count(*)::int AS n, avg(restock_lead_time_days) AS mean, stddev_pop(restock_lead_time_days) AS sd,
              stddev_pop(restock_lead_time_days) / NULLIF(avg(restock_lead_time_days), 0) AS cv
         FROM snaps WHERE restock_lead_time_days > 0`,
      q.params,
    )).rows[0];

    return {
      vendorId: v.vendor_id as string,
      name: v.vendor_name as string,
      itemSupplied: v.item_supplied as string,
      declaredLeadTimeDays: v.declared_lead_time_days as number,
      datesLeadTimeDays: v.dates_lt as number,
      lastOrderDate: v.last_order_date as string,
      nextDeliveryDate: v.next_delivery_date as string,
      leadTime: { mean: round(s.mean, 2), stdDev: round(s.sd, 2), cv: round(s.cv, 3), observations: s.n as number },
    };
  }
}
