import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { resolveFilters } from '../filters/filters';
import { loadExcess } from './excess-capital.controller';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Controller('impact')
export class BeforeAfterController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Antes vs. depois (spec 8.4). Regra explícita: suspendendo as encomendas dos artigos acima do máximo até o stock
   * voltar ao máximo, liberta-se o capital em excesso (K7). antes = valor de stock total; depois = antes − excesso.
   * Não prevê consumo nem preços. Aceita os filtros globais.
   */
  @Get('before-after')
  async beforeAfter(@Query() query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const { totals, rows } = await loadExcess(this.pool, filters);
    const excess = rows.reduce((s: number, r: { excess_value: number }) => s + r.excess_value, 0);
    const before = totals.total_value as number;
    return {
      before: round2(before),
      after: round2(before - excess),
      released: round2(excess),
      releasedPct: before === 0 ? 0 : Math.round((excess / before) * 10000) / 100,
      itemsAboveMax: rows.length,
    };
  }
}
