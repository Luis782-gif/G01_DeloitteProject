/// <reference types="node" />
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { TileGrid } from './TileGrid';
import { PAGE_TILES, PROFILE_COOKIE, parseProfile, type DashboardLayout, type PageId, type ProfileId } from './model';

const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';

/** Layout guardado do perfil (GET /api/layouts/:perfil); undefined = sem layout (404) ou API indisponível. */
export async function fetchSavedLayout(profile: ProfileId): Promise<DashboardLayout | undefined> {
  try {
    const res = await fetch(`${backend}/api/layouts/${profile}`, { cache: 'no-store' });
    if (!res.ok) return undefined;
    return ((await res.json()) as { layout: DashboardLayout }).layout;
  } catch {
    return undefined;
  }
}

/**
 * Mosaicos de uma página: o servidor lê o perfil do cookie e o layout dele, e desenha cada bloco (`nodes`, por id de mosaico);
 * o invólucro de cliente (TileGrid) só trata de ordem, tamanho e edição. Sem autenticação: o perfil é uma escolha do utilizador.
 */
export async function PageTiles({ page, nodes }: { page: PageId; nodes: Record<string, ReactNode> }) {
  const profile = parseProfile((await cookies()).get(PROFILE_COOKIE)?.value);
  const saved = await fetchSavedLayout(profile);
  const tiles = PAGE_TILES[page].filter((t) => t.id in nodes).map((t) => ({ ...t, node: nodes[t.id] }));
  return <TileGrid key={profile} page={page} profile={profile} saved={saved} tiles={tiles} />;
}
