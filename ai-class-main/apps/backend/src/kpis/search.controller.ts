import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { itemRef } from './reference-snapshot';

const MAX_QUERY_LENGTH = 100;
const MIN_QUERY_LENGTH = 2;
const LIMIT_PER_KIND = 10;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Minúsculas, sem acentos e só letras/dígitos: "X-ray Machine" e "xray machine" ficam iguais. */
export const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** 0 = prefixo, 1 = contém, null = sem correspondência. */
function rank(needle: string, ...fields: string[]): number | null {
  let best: number | null = null;
  for (const f of fields) {
    const i = fold(f).indexOf(needle);
    if (i === 0) return 0;
    if (i > 0) best = 1;
  }
  return best;
}

interface Result {
  kind: 'artigo' | 'fornecedor';
  ref: string;
  label: string;
  detail: string;
}

/** Pesquisa global (spec 10 e 11): artigos e fornecedores; não aplica os filtros globais. */
@Controller()
export class SearchController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('search')
  async search(@Query('q') q: unknown): Promise<{ results: Result[] }> {
    if (typeof q !== 'string' || q.length > MAX_QUERY_LENGTH || CONTROL_CHARS.test(q)) return { results: [] };
    const needle = fold(q);
    if (needle.length < MIN_QUERY_LENGTH) return { results: [] };

    const items = (await this.pool.query('SELECT DISTINCT item_id, item_name FROM dim_item')).rows as Array<{ item_id: number; item_name: string }>;
    const vendors = (await this.pool.query('SELECT vendor_id, vendor_name, item_supplied FROM dim_vendor')).rows as Array<{
      vendor_id: string;
      vendor_name: string;
      item_supplied: string;
    }>;

    const top = (list: Array<{ r: number; res: Result }>) =>
      list
        .sort((a, b) => a.r - b.r || a.res.label.localeCompare(b.res.label, 'pt') || a.res.ref.localeCompare(b.res.ref))
        .slice(0, LIMIT_PER_KIND)
        .map((x) => x.res);

    const artigos: Array<{ r: number; res: Result }> = [];
    for (const i of items) {
      const r = rank(needle, i.item_name, String(i.item_id));
      if (r !== null) artigos.push({ r, res: { kind: 'artigo', ref: itemRef(i.item_id, i.item_name), label: i.item_name, detail: `Código ${i.item_id}` } });
    }
    const fornecedores: Array<{ r: number; res: Result }> = [];
    for (const v of vendors) {
      const r = rank(needle, v.vendor_name, v.vendor_id);
      if (r !== null) fornecedores.push({ r, res: { kind: 'fornecedor', ref: v.vendor_id, label: v.vendor_name, detail: `${v.vendor_id} · ${v.item_supplied}` } });
    }
    return { results: [...top(artigos), ...top(fornecedores)] };
  }
}
