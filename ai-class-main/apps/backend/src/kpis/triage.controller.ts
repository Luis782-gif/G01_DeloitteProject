import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

/** Menos observações que isto no desvio-padrão: aviso de confiança baixa (spec 6.2 K8). */
export const LOW_CONFIDENCE_BELOW = 8;

const round = (n: number | null, d = 3) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * K8, K9 e K10 (spec 6.2). Por artigo, no snapshot de referência: stock de segurança, ponto de encomenda e nível 1-5.
 * Sem consumo (avg_usage_per_day = 0): sem SS nem PE (null), `noConsumption: true`, nível 1 (a regra do mínimo ainda pode subir a 4).
 * Parâmetros: filtros globais (incluindo `triagem`) e `servicoA`/`servicoB`/`servicoC` (95 a 99, em %).
 */
@Controller('triage')
export class TriageController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('items')
  async items(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const rows = (
      await this.pool.query(
        `WITH ${q.ctes}
         SELECT r.item_id, r.item_name, t.class, t.level, t.stock, t.usage, t.lt, t.ss, t.pe, t.sigma, t.n_obs,
                to_char(r.ref_date, 'YYYY-MM-DD') AS ref_date, r.stale, (SELECT count(*)::int FROM no_data) AS without_data
           FROM ref r JOIN triage t ON t.item_sk = r.item_sk
          ORDER BY t.level DESC, r.item_id, r.item_name`,
        q.params,
      )
    ).rows;
    const withoutData = rows.length
      ? (rows[0].without_data as number)
      : (await this.pool.query(`WITH ${q.ctes} SELECT count(*)::int AS n FROM no_data`, q.params)).rows[0].n;
    return {
      service: filters.service,
      z: filters.z,
      itemsWithoutData: withoutData,
      items: rows.map((r) => ({
        itemRef: itemRef(r.item_id, r.item_name),
        name: r.item_name as string,
        class: r.class as 'A' | 'B' | 'C',
        level: r.level as number,
        stock: r.stock as number,
        usage: r.usage as number,
        leadTime: r.lt as number,
        safetyStock: r.ss as number | null,
        reorderPoint: r.pe as number | null,
        sigma: round(r.sigma),
        observations: r.n_obs as number,
        lowConfidence: (r.n_obs as number) < LOW_CONFIDENCE_BELOW,
        noConsumption: (r.usage as number) === 0,
        referenceDate: r.ref_date as string,
        stale: r.stale as boolean,
      })),
    };
  }

  /** Distribuição dos níveis 1 a 5 (sempre 5 entradas). O nº em nível 5 é `find(l => l.level === 5).count`. */
  @Get('distribution')
  async distribution(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const rows = (
      await this.pool.query(
        `WITH ${q.ctes}
         SELECT t.level, count(*)::int AS count FROM ref r JOIN triage t ON t.item_sk = r.item_sk GROUP BY t.level`,
        q.params,
      )
    ).rows;
    return [1, 2, 3, 4, 5].map((level) => ({ level, count: (rows.find((r) => r.level === level)?.count as number) ?? 0 }));
  }
}
