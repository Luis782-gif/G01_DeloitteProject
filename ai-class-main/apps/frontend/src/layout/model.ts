/** Modelo puro do layout editável (sem React): disposição por defeito, mover, redimensionar, reconciliar. */

export type PageId = 'pulso' | 'onde-doi' | 'porque' | 'receita';
export interface TileLayout { id: string; position: number; w: number; h: number }
export interface DashboardLayout { pages: Partial<Record<PageId, { tiles: TileLayout[] }>> }

export const MIN_W = 3;
export const MAX_W = 12;
export const MAX_H = 8;

/** Mosaicos de cada página pela ordem por defeito (topo / meio / fim da narrativa) com o título usado nos controlos. */
export const PAGE_TILES: Record<PageId, { id: string; title: string }[]> = {
  pulso: [
    { id: 'insights', title: 'Frases-síntese' },
    { id: 'autonomia', title: 'Autonomia' },
    { id: 'abaixo-do-minimo', title: 'Abaixo do mínimo' },
    { id: 'triagem', title: 'Triagem' },
    { id: 'rotacao', title: 'Rotação' },
    { id: 'excesso', title: 'Capital em excesso' },
    { id: 'prazo-entrega', title: 'Prazo de entrega' },
    { id: 'tendencia', title: 'Tendência' },
  ],
  'onde-doi': [
    { id: 'insights', title: 'Frases-síntese' },
    { id: 'dispersao', title: 'Dispersão' },
    { id: 'pareto-abc', title: 'Pareto ABC' },
    { id: 'excesso-barras', title: 'Excesso por categoria' },
    { id: 'calendario', title: 'Calendário de rutura' },
  ],
  porque: [
    { id: 'insights', title: 'Frases-síntese' },
    { id: 'fornecedores', title: 'Fornecedores' },
  ],
  receita: [
    { id: 'insights', title: 'Frases-síntese' },
    { id: 'reposicao', title: 'Sugestões de reposição' },
    { id: 'antes-depois', title: 'Antes e depois' },
    { id: 'simulador', title: 'Simulador "E se…"' },
  ],
};

export const PROFILE_OPTIONS = [
  { id: 'diretor', label: 'Diretor' },
  { id: 'gestor-armazem', label: 'Gestor de armazém' },
  { id: 'comprador', label: 'Comprador' },
] as const;
export type ProfileId = (typeof PROFILE_OPTIONS)[number]['id'];
export const DEFAULT_PROFILE: ProfileId = 'diretor';
export const PROFILE_COOKIE = 'perfil';

/** Valor do cookie -> perfil válido; qualquer outra coisa cai no primeiro perfil. */
export function parseProfile(value: string | undefined | null): ProfileId {
  return PROFILE_OPTIONS.find((p) => p.id === value)?.id ?? DEFAULT_PROFILE;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));
const renumber = (tiles: TileLayout[]): TileLayout[] => tiles.map((t, i) => ({ ...t, position: i + 1 }));

export function defaultLayout(page: PageId): TileLayout[] {
  return PAGE_TILES[page].map((t, i) => ({ id: t.id, position: i + 1, w: MAX_W, h: 1 }));
}

/**
 * Junta um layout guardado com os mosaicos atuais da página: ids desconhecidos ignoram-se, mosaicos
 * em falta vão para o fim (pela ordem por defeito, com tamanho por defeito) e tamanhos são limitados.
 */
export function reconcile(saved: TileLayout[] | undefined, page: PageId): TileLayout[] {
  if (!saved) return defaultLayout(page);
  const known = new Set(PAGE_TILES[page].map((t) => t.id));
  const kept = saved
    .filter((t, i, all) => known.has(t.id) && all.findIndex((o) => o.id === t.id) === i)
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ ...t, w: clamp(t.w, MIN_W, MAX_W), h: clamp(t.h, 1, MAX_H) }));
  const have = new Set(kept.map((t) => t.id));
  const missing = defaultLayout(page).filter((t) => !have.has(t.id));
  return renumber([...kept, ...missing]);
}

/** Troca o mosaico com o vizinho (-1 = para cima, 1 = para baixo); nos extremos não muda nada. */
export function moveTile(tiles: TileLayout[], id: string, dir: -1 | 1): TileLayout[] {
  const i = tiles.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tiles.length) return renumber(tiles);
  const next = [...tiles];
  [next[i], next[j]] = [next[j], next[i]];
  return renumber(next);
}

/** Move o mosaico para o índice indicado (0-based; limitado ao fim). Usado pelo arrastar. */
export function moveTileTo(tiles: TileLayout[], id: string, index: number): TileLayout[] {
  const i = tiles.findIndex((t) => t.id === id);
  if (i < 0) return renumber(tiles);
  const next = [...tiles];
  const [t] = next.splice(i, 1);
  next.splice(clamp(index, 0, next.length), 0, t);
  return renumber(next);
}

/** Muda a largura (colunas, MIN_W..MAX_W) ou a altura (unidades, 1..MAX_H) em passos. */
export function resizeTile(tiles: TileLayout[], id: string, dim: 'w' | 'h', delta: number): TileLayout[] {
  return tiles.map((t) =>
    t.id !== id ? t : { ...t, [dim]: dim === 'w' ? clamp(t.w + delta, MIN_W, MAX_W) : clamp(t.h + delta, 1, MAX_H) },
  );
}

/** Põe os mosaicos de uma página no layout completo do perfil, sem tocar nas outras páginas. */
export function mergePage(full: DashboardLayout | undefined, page: PageId, tiles: TileLayout[]): DashboardLayout {
  return { pages: { ...(full?.pages ?? {}), [page]: { tiles } } };
}
