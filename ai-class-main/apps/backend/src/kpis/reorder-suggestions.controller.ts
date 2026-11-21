import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { filteredSnapshots } from '../filters/filtered-snapshots';
import { resolveFilters } from '../filters/filters';
import { itemRef } from './reference-snapshot';

export interface ReorderRow {
  itemRef: string;
  name: string;
  level: number;
  class: 'A' | 'B' | 'C';
  stock: number;
  reorderPoint: number;
  safetyStock: number;
  /** Quantidade sugerida (heurística, sem QEE). */
  suggest: number;
  reason: string;
  lowConfidence: boolean;
}

/** Menos observações que isto no desvio-padrão: aviso de confiança baixa (spec 6.2 K8). */
const LOW_CONFIDENCE_BELOW = 8;

/**
 * Quantidade sugerida (heurística, sem QEE): repor até ao stock máximo (`max - stock`);
 * se o máximo for inconsistente (R11: mínimo > máximo) ou inferior ao PE, repor até ao PE.
 */
export function suggestOrder(stock: number, pe: number, max: number, r11: boolean): { suggest: number; toPe: boolean } {
  const toPe = r11 || max < pe;
  return { suggest: Math.max(0, (toPe ? pe : max) - stock), toPe };
}

function reasonText(stock: number, usage: number, lt: number, pe: number, toPe: boolean, r11: boolean): string {
  const demand = usage * lt;
  const why =
    stock < demand
      ? `stock ${stock} abaixo da rutura esperada no tempo de reposição (${demand})`
      : `stock ${stock} dentro da margem do stock de segurança (rutura esperada ${demand}, ponto de encomenda ${pe})`;
  if (!toPe) return `${why}. Repor até ao stock máximo.`;
  return `${why}. ${r11 ? 'Stock máximo inconsistente (mínimo acima do máximo)' : 'Stock máximo inferior ao ponto de encomenda'}: repor até ao ponto de encomenda.`;
}

const CSV_HEADER = ['Artigo', 'Nome', 'Nível de triagem', 'Stock', 'Ponto de encomenda', 'Stock de segurança', 'Quantidade sugerida', 'Motivo'];
const csvCell = (v: string | number) => {
  const s = String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Receita (spec 8.4): artigos abaixo do ponto de encomenda (stock < PE, K9), por nível de triagem decrescente
 * e depois por folga (stock - PE) crescente. Sem consumo não há PE: ficam fora e contam em `withoutConsumption`.
 */
@Controller('reorder-suggestions')
export class ReorderSuggestionsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async list(query: Record<string, unknown>) {
    const filters = await resolveFilters(this.pool, query);
    const q = filteredSnapshots(filters);
    const rows = (
      await this.pool.query(
        `WITH ${q.ctes}
         SELECT r.item_id, r.item_name, t.class, t.level, t.stock, t.usage, t.lt, t.ss, t.pe, t.n_obs,
                r.max_capacity, t.r11, (SELECT count(*)::int FROM ref r2 JOIN triage t2 ON t2.item_sk = r2.item_sk WHERE t2.usage = 0) AS without_consumption
           FROM ref r JOIN triage t ON t.item_sk = r.item_sk
          WHERE t.usage > 0 AND t.stock < t.pe
          ORDER BY t.level DESC, (t.stock - t.pe) ASC, r.item_id, r.item_name`,
        q.params,
      )
    ).rows;
    const withoutConsumption = rows.length
      ? (rows[0].without_consumption as number)
      : (
          await this.pool.query(
            `WITH ${q.ctes} SELECT count(*)::int AS n FROM ref r JOIN triage t ON t.item_sk = r.item_sk WHERE t.usage = 0`,
            q.params,
          )
        ).rows[0].n;
    const items: ReorderRow[] = rows.map((r) => {
      const { suggest, toPe } = suggestOrder(r.stock, r.pe, r.max_capacity, r.r11);
      return {
        itemRef: itemRef(r.item_id, r.item_name),
        name: r.item_name,
        level: r.level,
        class: r.class,
        stock: r.stock,
        reorderPoint: r.pe,
        safetyStock: r.ss,
        suggest,
        reason: reasonText(r.stock, r.usage, r.lt, r.pe, toPe, r.r11),
        lowConfidence: r.n_obs < LOW_CONFIDENCE_BELOW,
      };
    });
    return {
      items,
      totals: { items: items.length, units: items.reduce((s, i) => s + i.suggest, 0) },
      withoutConsumption: withoutConsumption as number,
    };
  }

  @Get()
  async suggestions(@Query() query: Record<string, unknown>) {
    return this.list(query);
  }

  /** Mesmo conteúdo da lista filtrada; UTF-8 com BOM, separador `;` e CRLF (Excel pt-PT). */
  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="lista-de-compras.csv"')
  async exportCsv(@Query() query: Record<string, unknown>) {
    const { items } = await this.list(query);
    const lines = [
      CSV_HEADER,
      ...items.map((i) => [i.itemRef, i.name, i.level, i.stock, i.reorderPoint, i.safetyStock, i.suggest, i.reason]),
    ].map((cols) => cols.map(csvCell).join(';'));
    return '﻿' + lines.join('\r\n') + '\r\n';
  }
}
