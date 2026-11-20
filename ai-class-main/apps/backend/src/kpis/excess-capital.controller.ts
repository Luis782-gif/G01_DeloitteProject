import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

/** Limiares por defeito de K7 (spec 6.2), em % do valor total de stock. */
export const DEFAULT_OK_PCT = 5;
export const DEFAULT_ATENCAO_PCT = 10;
/** X por defeito de K7b: dias de autonomia acima dos quais o stock se considera parado. */
export const DEFAULT_IDLE_DAYS = 60;

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct2 = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 10000) / 100);

function number(query: Record<string, unknown>, field: string, fallback: number, { min, integer }: { min: number; integer?: boolean }) {
  const raw = query[field];
  if (raw === undefined || raw === '') return fallback;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) {
    throw new BadRequestException({ error: `Parâmetro inválido: ${field}="${String(raw)}"`, field });
  }
  return n;
}

/** Valor total de stock e artigos acima do máximo no snapshot de referência (partilhado por K7 e antes/depois). */
export async function loadExcess(pool: Pool, filters: Awaited<ReturnType<typeof resolveFilters>>) {
  const q = filteredSnapshots(filters);
  const totals = (await pool.query(
    `WITH ${q.ctes}
     SELECT (SELECT count(*)::int FROM no_data) AS without_data,
            COALESCE(sum(stock_value), 0)::float8 AS total_value
       FROM ref`,
    q.params,
  )).rows[0];
  const rows = (await pool.query(
    `WITH ${q.ctes}
     SELECT t.item_type AS type, r.item_id, r.item_name,
            (r.current_stock - r.max_capacity) AS excess_units,
            ((r.current_stock - r.max_capacity) * r.unit_cost)::float8 AS excess_value
       FROM ref r JOIN dim_item_type t ON t.item_type_id = r.item_type_id
      WHERE r.current_stock > r.max_capacity
      ORDER BY excess_value DESC, r.item_id, r.item_name`,
    q.params,
  )).rows;
  return { totals, rows };
}

@Controller('kpis')
export class ExcessCapitalController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * K7: capital em excesso = Σ máx(0, stock − máximo) × custo unitário no snapshot de referência,
   * em € e em % do valor total de stock. Os snapshots R11 (mínimo > máximo) entram: só usam o máximo.
   * Limiares parametrizáveis: `okPct` (5) e `atencaoPct` (10). Aceita os filtros globais.
   */
  @Get('excess-capital')
  async excessCapital(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const okPct = number(query, 'okPct', DEFAULT_OK_PCT, { min: 0 });
    const atencaoPct = number(query, 'atencaoPct', DEFAULT_ATENCAO_PCT, { min: okPct });
    const { totals, rows } = await loadExcess(this.pool, filters);

    const byType = new Map<string, { type: string; valueEur: number; items: unknown[] }>();
    let value = 0;
    for (const r of rows) {
      const g = byType.get(r.type) ?? { type: r.type as string, valueEur: 0, items: [] };
      g.valueEur += r.excess_value;
      g.items.push({ itemRef: itemRef(r.item_id, r.item_name), name: r.item_name, excessUnits: r.excess_units, valueEur: round2(r.excess_value) });
      byType.set(r.type, g);
      value += r.excess_value;
    }
    const pct = pct2(value, totals.total_value);
    return {
      valueEur: round2(value),
      totalValueEur: round2(totals.total_value),
      pct,
      status: pct <= okPct ? 'ok' : pct <= atencaoPct ? 'atencao' : 'critico',
      thresholds: { okPct, atencaoPct },
      itemsAbove: rows.length,
      itemsWithoutData: totals.without_data as number,
      byType: [...byType.values()].map((g) => ({ ...g, valueEur: round2(g.valueEur) })).sort((a, b) => b.valueEur - a.valueEur),
    };
  }

  /**
   * K7b (segunda vista, nunca somada a K7): stock parado = Σ máx(0, stock − X × consumo diário) × custo,
   * X = `dias` (60 por defeito). Informativo, sem estado. Aceita os filtros globais.
   */
  @Get('idle-stock')
  async idleStock(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const days = number(query, 'dias', DEFAULT_IDLE_DAYS, { min: 1, integer: true });
    const q = filteredSnapshots(filters);
    const n = q.params.length + 1;

    const rows = (await this.pool.query(
      `WITH ${q.ctes}
       SELECT item_id, item_name, (current_stock - $${n}::int * avg_usage_per_day) AS idle_units,
              ((current_stock - $${n}::int * avg_usage_per_day) * unit_cost)::float8 AS idle_value
         FROM ref
        WHERE current_stock > $${n}::int * avg_usage_per_day
        ORDER BY idle_value DESC, item_id, item_name`,
      [...q.params, days],
    )).rows;
    const without = (await this.pool.query(`WITH ${q.ctes} SELECT count(*)::int AS c FROM no_data`, q.params)).rows[0].c as number;

    return {
      days,
      valueEur: round2(rows.reduce((s, r) => s + r.idle_value, 0)),
      itemsOver: rows.length,
      itemsWithoutData: without,
      items: rows.map((r) => ({ itemRef: itemRef(r.item_id, r.item_name), name: r.item_name as string, idleUnits: r.idle_units as number, valueEur: round2(r.idle_value) })),
    };
  }
}
