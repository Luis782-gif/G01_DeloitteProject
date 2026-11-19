import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

const positiveInt = (v: unknown, fallback: number, max: number) => {
  const n = Number.parseInt(typeof v === 'string' ? v : '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);
const r3 = (n: number | null) => (n === null ? null : round(n, 3));

@Controller('kpis')
export class RotationController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * K2: rotação do stock = consumo estimado / stock médio, por artigo e agregada.
   * Consumo estimado = média de `avg_usage_per_day` dos snapshots do período x dias do período (inclusivos);
   * stock médio = média de `current_stock`. Sem filtro `periodo`, os dias são o intervalo completo dos dados.
   * Versão em valor (secundária): consumo x custo unitário médio / média de `stock_value`.
   * Agregada = razão das somas (soma dos consumos / soma dos stocks médios). Anualizada = x 365 / dias.
   */
  @Get('rotation')
  async rotation(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const page = positiveInt(query.page, 1, 1_000_000);
    const pageSize = positiveInt(query.pageSize, 50, 500);

    const period = (await this.pool.query(
      `WITH ${q.ctes} SELECT (to_date - from_date + 1)::int AS days, (SELECT count(*)::int FROM no_data) AS without_data FROM bounds`,
      q.params,
    )).rows[0];
    const periodDays = (period?.days ?? 0) as number;

    const { rows } = await this.pool.query(
      `WITH ${q.ctes}
       SELECT item_id, item_name, count(*)::int AS n,
              avg(avg_usage_per_day)::float8 AS avg_usage, avg(current_stock)::float8 AS avg_stock,
              avg(unit_cost)::float8 AS avg_cost, avg(stock_value)::float8 AS avg_value
         FROM snaps GROUP BY item_sk, item_id, item_name
        ORDER BY item_id, item_name`,
      q.params,
    );

    const annual = (x: number | null) => (x === null || periodDays <= 0 ? null : x * (365 / periodDays));
    let sumCons = 0, sumStock = 0, sumConsValue = 0, sumValue = 0;
    const all = rows.map((r) => {
      const cons = r.avg_usage * periodDays;
      const consValue = cons * r.avg_cost;
      sumCons += cons; sumStock += r.avg_stock; sumConsValue += consValue; sumValue += r.avg_value;
      const rot = ratio(cons, r.avg_stock);
      const vrot = ratio(consValue, r.avg_value);
      return {
        itemRef: itemRef(r.item_id, r.item_name),
        name: r.item_name as string,
        snapshots: r.n as number,
        estimatedConsumption: round(cons, 3),
        averageStock: round(r.avg_stock, 3),
        rotation: r3(rot),
        annualizedRotation: r3(annual(rot)),
        value: { secondary: true as const, rotation: r3(vrot), annualizedRotation: r3(annual(vrot)) },
      };
    });
    const rot = ratio(sumCons, sumStock);
    const vrot = ratio(sumConsValue, sumValue);
    return {
      periodDays,
      itemsWithoutData: period?.without_data ?? 0,
      estimatedConsumption: round(sumCons, 3),
      averageStock: round(sumStock, 3),
      rotation: r3(rot),
      annualizedRotation: r3(annual(rot)),
      value: { secondary: true as const, rotation: r3(vrot), annualizedRotation: r3(annual(vrot)) },
      items: all.slice((page - 1) * pageSize, page * pageSize),
    };
  }
}
