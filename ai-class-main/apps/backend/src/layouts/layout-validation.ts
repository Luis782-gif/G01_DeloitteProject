export const PROFILES = ['diretor', 'gestor-armazem', 'comprador'] as const;
export const LAYOUT_PAGES = ['pulso', 'onde-doi', 'porque', 'receita'] as const;
export const MAX_LAYOUT_BYTES = 16_384;
export const MAX_TILES_PER_PAGE = 30;
export const MAX_COLUMNS = 12; // largura (w) em colunas, 1..12
export const MAX_ROWS = 8; // altura (h) em unidades, 1..8
export const MAX_POSITION = 100; // ordem 1..100

export interface TileLayout { id: string; position: number; w: number; h: number }
export interface DashboardLayout { pages: Partial<Record<(typeof LAYOUT_PAGES)[number], { tiles: TileLayout[] }>> }

export class LayoutError extends Error {
  constructor(message: string, readonly field: string) {
    super(message);
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const intIn = (v: unknown, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= max;

export function isProfile(p: string): boolean {
  return (PROFILES as readonly string[]).includes(p);
}

/** Valida a forma do layout; lança LayoutError com o campo em falta/errado. Devolve o layout normalizado. */
export function validateLayout(input: unknown): DashboardLayout {
  if (!isObj(input)) throw new LayoutError('O layout tem de ser um objeto.', 'layout');
  if (Buffer.byteLength(JSON.stringify(input)) > MAX_LAYOUT_BYTES) {
    throw new LayoutError(`O layout excede ${MAX_LAYOUT_BYTES} bytes.`, 'layout');
  }
  const pages = input.pages;
  if (!isObj(pages)) throw new LayoutError('Falta "pages" (objeto).', 'layout.pages');
  const out: DashboardLayout = { pages: {} };
  for (const [page, value] of Object.entries(pages)) {
    if (!(LAYOUT_PAGES as readonly string[]).includes(page)) {
      throw new LayoutError(`Página desconhecida: ${page}.`, `layout.pages.${page}`);
    }
    const tiles = isObj(value) ? value.tiles : undefined;
    if (!Array.isArray(tiles)) throw new LayoutError('Falta "tiles" (lista).', `layout.pages.${page}.tiles`);
    if (tiles.length > MAX_TILES_PER_PAGE) {
      throw new LayoutError(`No máximo ${MAX_TILES_PER_PAGE} mosaicos por página.`, `layout.pages.${page}.tiles`);
    }
    const seen = new Set<string>();
    const clean = tiles.map((t, i): TileLayout => {
      const f = (k: string) => `layout.pages.${page}.tiles[${i}].${k}`;
      if (!isObj(t)) throw new LayoutError('Mosaico inválido.', `layout.pages.${page}.tiles[${i}]`);
      if (typeof t.id !== 'string' || t.id.length < 1 || t.id.length > 64) throw new LayoutError('"id" tem de ser texto (1 a 64).', f('id'));
      if (seen.has(t.id)) throw new LayoutError(`Mosaico repetido: ${t.id}.`, f('id'));
      seen.add(t.id);
      if (!intIn(t.position, MAX_POSITION)) throw new LayoutError(`"position" tem de ser inteiro de 1 a ${MAX_POSITION}.`, f('position'));
      if (!intIn(t.w, MAX_COLUMNS)) throw new LayoutError(`"w" tem de ser inteiro de 1 a ${MAX_COLUMNS}.`, f('w'));
      if (!intIn(t.h, MAX_ROWS)) throw new LayoutError(`"h" tem de ser inteiro de 1 a ${MAX_ROWS}.`, f('h'));
      return { id: t.id, position: t.position as number, w: t.w as number, h: t.h as number };
    });
    out.pages[page as (typeof LAYOUT_PAGES)[number]] = { tiles: clean };
  }
  return out;
}
