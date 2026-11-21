import { BadRequestException, Body, Controller, HttpCode, Inject, Post, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { simulateItem, type Scenario } from './triage';

export const MAX_LEAD_TIME_DELTA_DAYS = 60;
export const MAX_USAGE_DELTA_PCT = 200;

const bad = (field: string, error: string) => new BadRequestException({ error, field });

function number(body: Record<string, unknown>, field: string, max: number): number {
  const v = body[field];
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) throw bad(field, `"${field}" tem de ser um número entre 0 e ${max}`);
  return v;
}

const distribution = (levels: number[]) => [1, 2, 3, 4, 5].map((level) => ({ level, count: levels.filter((l) => l === level).length }));

/**
 * Simulador "E se…?" (spec 8.6). Cenário: tempo de reposição +N dias (global ou só de um fornecedor) e consumo +Y %.
 * Recalcula no servidor, para cada artigo no snapshot de referência, folga, stock de segurança, ponto de encomenda e triagem.
 * Devolve só contagens; não prevê nada. Filtros comuns na query.
 */
@Controller('simulations')
export class SimulationsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Post()
  @HttpCode(200)
  async simulate(@Body() rawBody: unknown, @Query() query: Record<string, unknown>) {
    const body = (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {}) as Record<string, unknown>;
    const scenario: Scenario = {
      leadTimeDeltaDays: number(body, 'leadTimeDeltaDays', MAX_LEAD_TIME_DELTA_DAYS),
      usageDeltaPct: number(body, 'usageDeltaPct', MAX_USAGE_DELTA_PCT),
      vendorId: null,
    };
    if (body.vendorId !== undefined && body.vendorId !== null && body.vendorId !== '') {
      if (typeof body.vendorId !== 'string' || (await this.pool.query('SELECT 1 FROM dim_vendor WHERE vendor_id = $1', [body.vendorId])).rowCount === 0) {
        throw bad('vendorId', `Fornecedor inexistente: "${String(body.vendorId)}"`);
      }
      scenario.vendorId = body.vendorId;
    }

    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const rows = (
      await this.pool.query(
        `WITH ${q.ctes}
         SELECT t.stock, t.usage, t.lt, t.sigma, t.z::float8 AS z, t.class, t.min_required, t.r11, r.vendor_id
           FROM ref r JOIN triage t ON t.item_sk = r.item_sk`,
        q.params,
      )
    ).rows;

    let negBefore = 0;
    let negAfter = 0;
    let newNeg = 0;
    const before: number[] = [];
    const after: number[] = [];
    const none = { leadTimeDeltaDays: 0, usageDeltaPct: 0, vendorId: null };
    for (const r of rows) {
      const item = {
        stock: r.stock as number,
        usage: r.usage as number,
        lt: r.lt as number,
        sigma: r.sigma as number | null,
        z: r.z as number,
        class: r.class as 'A' | 'B' | 'C',
        minRequired: r.min_required as number,
        minAboveMax: r.r11 as boolean,
        vendorId: r.vendor_id as string,
      };
      const b = simulateItem(item, none);
      const a = simulateItem(item, scenario);
      const wasNeg = b.slack !== null && b.slack < 0;
      const isNeg = a.slack !== null && a.slack < 0;
      if (wasNeg) negBefore++;
      if (isNeg) negAfter++;
      if (!wasNeg && isNeg) newNeg++;
      before.push(b.outcome.level);
      after.push(a.outcome.level);
    }
    return {
      itemsTotal: rows.length,
      negativeSlackBefore: negBefore,
      negativeSlackAfter: negAfter,
      newNegativeSlack: newNeg,
      triageBefore: distribution(before),
      triageAfter: distribution(after),
    };
  }
}
