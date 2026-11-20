import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { autonomyDays, slackDays } from './autonomy';
import { DEFAULT_DISTINGUISH_DAYS, distinguishVerdict, riskIndex } from './vendor-risk';

const round = (v: unknown, d: number): number | null => (v === null || v === undefined ? null : Math.round(Number(v) * 10 ** d) / 10 ** d);

/** K11 (índice de risco), K12 (prometido vs. real) e sazonalidade do LT, por fornecedor, com os filtros globais. */
@Controller('vendors')
export class VendorsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async vendors(@Query() query: Record<string, unknown>) {
    const raw = query.distinguishDays;
    const distinguishDays = raw === undefined || raw === '' ? DEFAULT_DISTINGUISH_DAYS : Number(raw);
    if (typeof raw === 'string' && raw !== '' && !Number.isFinite(distinguishDays)) {
      throw new BadRequestException({ error: `Limiar inválido: ${raw}`, field: 'distinguishDays' });
    }
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const valid = 'restock_lead_time_days > 0';
    const p = q.params.length + 1;

    const base = (
      await this.pool.query(
        `WITH ${q.ctes},
         st AS (SELECT vendor_id, count(*)::int AS n, avg(restock_lead_time_days) AS mean,
                       stddev_pop(restock_lead_time_days) AS sd,
                       stddev_pop(restock_lead_time_days) / NULLIF(avg(restock_lead_time_days), 0) AS cv
                  FROM snaps WHERE ${valid} GROUP BY vendor_id)
         SELECT v.vendor_id, v.vendor_name, v.declared_lead_time_days AS declared,
                (v.next_delivery_date - v.last_order_date) AS dates_days,
                st.n, st.mean, st.sd, st.cv
           FROM dim_vendor v LEFT JOIN st ON st.vendor_id = v.vendor_id
          WHERE ($${p}::text IS NULL OR v.vendor_id = $${p}::text)
          ORDER BY v.vendor_id`,
        [...q.params, filters.vendorId],
      )
    ).rows;

    const refRows = (
      await this.pool.query(
        `WITH ${q.ctes} SELECT vendor_id, current_stock, avg_usage_per_day, restock_lead_time_days FROM ref`,
        q.params,
      )
    ).rows;

    const seasonality = (
      await this.pool.query(
        `WITH ${q.ctes}
         SELECT extract(month FROM snap_date)::int AS month, avg(restock_lead_time_days) AS mean, count(*)::int AS n
           FROM snaps WHERE ${valid} GROUP BY 1 ORDER BY 1`,
        q.params,
      )
    ).rows;

    const vendors = base.map((r) => {
      const mine = refRows.filter((x) => x.vendor_id === r.vendor_id);
      const slacks = mine.map((x) => slackDays(autonomyDays(x.current_stock, x.avg_usage_per_day), x.restock_lead_time_days));
      const withSlack = slacks.filter((s): s is number => s !== null);
      const atRisk = withSlack.filter((s) => s < 0).length;
      const pct = withSlack.length === 0 ? 0 : (atRisk / withSlack.length) * 100;
      return {
        vendorId: r.vendor_id as string,
        vendorName: r.vendor_name as string,
        mean: round(r.mean, 2),
        stdDev: round(r.sd, 2),
        cv: round(r.cv, 3),
        observations: (r.n ?? 0) as number,
        items: mine.length,
        itemsAtRisk: atRisk,
        pctAtRisk: Math.round(pct * 10) / 10,
        declaredDays: r.declared as number | null,
        datesDays: r.dates_days as number | null,
        _raw: { mean: r.mean === null ? null : Number(r.mean), cv: r.cv === null ? null : Number(r.cv), pct },
      };
    });

    const ranked = vendors.filter((v) => v._raw.mean !== null && v._raw.cv !== null);
    const risks = riskIndex(ranked.map((v) => ({ mean: v._raw.mean!, cv: v._raw.cv!, pctAtRisk: v._raw.pct })));
    const verdict = distinguishVerdict(ranked.map((v) => v._raw.mean!), distinguishDays);

    return {
      distinguishDays,
      distinguishes: verdict.distinguishes,
      distinguishText: verdict.text,
      maxDifferenceDays: verdict.maxDifferenceDays,
      vendors: vendors.map(({ _raw, ...v }) => {
        const k = ranked.findIndex((x) => x.vendorId === v.vendorId);
        return { ...v, risk: k >= 0 ? risks[k] : null };
      }),
      seasonality: seasonality.map((r) => ({ month: r.month as number, mean: round(r.mean, 2), observations: r.n as number })),
    };
  }
}
