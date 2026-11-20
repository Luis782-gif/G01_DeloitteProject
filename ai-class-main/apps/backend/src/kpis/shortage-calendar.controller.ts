import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { autonomyDays } from './autonomy';
import { itemRef } from './reference-snapshot';

const DAY_MS = 86_400_000;

/** Data de esgotamento: data de referência + parte inteira da autonomia (truncada ao dia), 'YYYY-MM-DD'. */
export const depletionDate = (refDate: string, autonomy: number): string =>
  new Date(Date.parse(`${refDate}T00:00:00Z`) + Math.floor(autonomy) * DAY_MS).toISOString().slice(0, 10);

/** Calendário de rutura iminente (spec 8.2/11): assume consumo constante. Com os filtros globais. */
@Controller()
export class ShortageCalendarController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('shortage-calendar')
  async calendar(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const { rows } = await this.pool.query(
      `WITH ${q.ctes}
       SELECT item_id, item_name, current_stock, avg_usage_per_day,
              to_char(ref_date, 'YYYY-MM-DD') AS ref_date, to_char(cutoff_date, 'YYYY-MM-DD') AS cutoff_date, stale
         FROM ref
        ORDER BY item_id, item_name`,
      q.params,
    );
    const items: Array<{
      itemRef: string; name: string; depletionDate: string; autonomyDays: number; referenceDate: string; stale: boolean; alreadyDepleted: boolean;
    }> = [];
    const noConsumption: Array<{ itemRef: string; name: string; referenceDate: string; stale: boolean }> = [];
    for (const r of rows) {
      const autonomy = autonomyDays(r.current_stock, r.avg_usage_per_day);
      const ref = itemRef(r.item_id, r.item_name);
      if (autonomy === null) {
        noConsumption.push({ itemRef: ref, name: r.item_name, referenceDate: r.ref_date, stale: r.stale });
        continue;
      }
      const date = depletionDate(r.ref_date, autonomy);
      items.push({
        itemRef: ref,
        name: r.item_name,
        depletionDate: date,
        autonomyDays: Math.round(autonomy * 1000) / 1000,
        referenceDate: r.ref_date,
        stale: r.stale,
        alreadyDepleted: date < r.cutoff_date,
      });
    }
    items.sort((a, b) => a.depletionDate.localeCompare(b.depletionDate) || a.itemRef.localeCompare(b.itemRef));
    return {
      cutoffDate: rows.length ? (rows[0].cutoff_date as string) : null,
      items,
      noConsumption,
    };
  }
}
