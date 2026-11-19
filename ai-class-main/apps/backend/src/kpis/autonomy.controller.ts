import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import {
  DEFAULT_SLACK_THRESHOLDS,
  autonomyDays,
  median,
  slackDays,
  slackStatus,
  type SlackThresholds,
  type Status,
} from './autonomy';
import { itemRef } from './reference-snapshot';

const threshold = (v: unknown, field: string, fallback: number) => {
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (typeof v !== 'string' || !Number.isFinite(n)) throw new BadRequestException({ error: `Limiar inválido: ${String(v)}`, field });
  return n;
};

const round = (n: number | null, d = 3) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);

/** K1, K6 e K13 sobre o snapshot de referência, com os filtros globais. */
@Controller('kpis')
export class AutonomyController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async load(query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const thresholds: SlackThresholds = {
      ok: threshold(query.slackOk, 'slackOk', DEFAULT_SLACK_THRESHOLDS.ok),
      critical: threshold(query.slackCritical, 'slackCritical', DEFAULT_SLACK_THRESHOLDS.critical),
    };
    const q = filteredSnapshots(filters);
    const { rows } = await this.pool.query(
      `WITH ${q.ctes}
       SELECT item_id, item_name, current_stock, avg_usage_per_day, restock_lead_time_days,
              to_char(ref_date, 'YYYY-MM-DD') AS ref_date, stale, (SELECT count(*)::int FROM no_data) AS without_data
         FROM ref
        ORDER BY item_id, item_name`,
      q.params,
    );
    let withoutData = rows.length ? (rows[0].without_data as number) : 0;
    if (rows.length === 0) {
      withoutData = (await this.pool.query(`WITH ${q.ctes} SELECT count(*)::int AS n FROM no_data`, q.params)).rows[0].n;
    }
    const items = rows.map((r) => {
      const autonomy = autonomyDays(r.current_stock, r.avg_usage_per_day);
      const slack = slackDays(autonomy, r.restock_lead_time_days);
      return {
        itemRef: itemRef(r.item_id, r.item_name),
        name: r.item_name as string,
        autonomy: round(autonomy),
        leadTime: r.restock_lead_time_days as number,
        slack: round(slack),
        status: slack === null ? null : slackStatus(slack, thresholds),
        noConsumption: autonomy === null,
        referenceDate: r.ref_date as string,
        stale: r.stale as boolean,
        _autonomy: autonomy,
        _slack: slack,
      };
    });
    const withValue = items.filter((i) => i._slack !== null);
    const medianSlack = median(withValue.map((i) => i._slack as number));
    return {
      thresholds,
      withoutData,
      items: items.map(({ _autonomy, _slack, ...i }) => i),
      n: withValue.length,
      noConsumption: items.length - withValue.length,
      medianAutonomy: median(items.flatMap((i) => (i._autonomy === null ? [] : [i._autonomy]))),
      medianSlack,
      statusOf: (slack: number | null): Status | null => (slack === null ? null : slackStatus(slack, thresholds)),
    };
  }

  /** K1: autonomia por artigo e agregada (mediana, sem os artigos "sem consumo"). Estado via mediana dos dias de folga. */
  @Get('autonomy')
  async autonomy(@Query() query: Record<string, unknown>) {
    const d = await this.load(query);
    return {
      median: round(d.medianAutonomy),
      unit: 'dias',
      n: d.n,
      noConsumption: d.noConsumption,
      status: d.statusOf(d.medianSlack),
      itemsWithoutData: d.withoutData,
      items: d.items,
    };
  }

  /** K6: dias de folga por artigo (lista/dispersão) e agregados (mediana, contagem por estado). */
  @Get('slack-days')
  async slackDaysKpi(@Query() query: Record<string, unknown>) {
    const d = await this.load(query);
    const counts = { ok: 0, atencao: 0, critico: 0 };
    for (const i of d.items) if (i.status) counts[i.status]++;
    return {
      median: round(d.medianSlack),
      unit: 'dias',
      thresholds: d.thresholds,
      status: d.statusOf(d.medianSlack),
      counts,
      n: d.n,
      noConsumption: d.noConsumption,
      itemsWithoutData: d.withoutData,
      items: d.items,
    };
  }

  /** K13: % de artigos com dias de folga < 0 (= K6 crítico com o limiar crítico por defeito). */
  @Get('shortage-rate')
  async shortageRate(@Query() query: Record<string, unknown>) {
    const d = await this.load(query);
    const count = d.items.filter((i) => i.slack !== null && i.slack < 0).length;
    const pct = d.n === 0 ? 0 : Math.round((count / d.n) * 1000) / 10;
    return {
      count,
      n: d.n,
      pct,
      unit: '%',
      status: count === 0 ? ('ok' as Status) : ('critico' as Status),
      noConsumption: d.noConsumption,
      itemsWithoutData: d.withoutData,
    };
  }
}
