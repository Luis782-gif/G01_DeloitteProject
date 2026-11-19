import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

@Controller('abc')
export class AbcController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * K4 / Pareto ABC (spec 7): valor de stock = current_stock × unit_cost no snapshot de referência,
   * por ordem decrescente, com % acumulada e classe. A classe vem da CTE `abc`, calculada sobre todos os
   * artigos do período antes de artigo/tipo/fornecedor; os filtros só escolhem que linhas se mostram.
   * Parâmetros: `cutA`, `cutB` (por defeito 80 e 95) e os filtros globais.
   */
  @Get('pareto')
  async pareto(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const rows = (
      await this.pool.query(
        `WITH ${q.ctes}
         SELECT a.item_id, a.item_name, a.value, a.cum_pct, a.ref_cum_pct, a.class
           FROM abc a
          WHERE a.item_sk IN (SELECT item_sk FROM ref)
          ORDER BY a.pos`,
        q.params,
      )
    ).rows;
    return rows.map((r) => ({
      itemRef: itemRef(r.item_id, r.item_name),
      name: r.item_name as string,
      value: r.value as number,
      cumPct: r.cum_pct as number,
      refCumPct: r.ref_cum_pct as number,
      class: r.class as 'A' | 'B' | 'C',
    }));
  }
}
