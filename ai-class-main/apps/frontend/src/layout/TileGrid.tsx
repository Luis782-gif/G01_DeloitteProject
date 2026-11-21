'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TileGridView, type TileMeta } from './TileGridView';
import {
  mergePage, moveTile, moveTileTo, reconcile, resizeTile, PROFILE_OPTIONS,
  type DashboardLayout, type PageId, type ProfileId, type TileLayout,
} from './model';

/**
 * Invólucro de cliente dos mosaicos de uma página. Os filhos (`node`) chegam já desenhados pelo servidor.
 * Só fala com a API via o proxy /api/layouts/:perfil (PUT para guardar, DELETE para repor).
 */
export function TileGrid({ page, profile, saved, tiles }: { page: PageId; profile: ProfileId; saved?: DashboardLayout; tiles: TileMeta[] }) {
  const router = useRouter();
  const titleOf = (id: string) => tiles.find((t) => t.id === id)?.title ?? id;
  const [layout, setLayout] = useState<TileLayout[]>(() => reconcile(saved?.pages[page]?.tiles, page));
  const [editing, setEditing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const persisted = useRef<{ full: DashboardLayout | undefined; page: TileLayout[] }>({ full: saved, page: layout });
  const profileLabel = PROFILE_OPTIONS.find((p) => p.id === profile)?.label ?? profile;
  const url = `/api/layouts/${profile}`;
  const refocus = useRef<{ id: string; label: string } | null>(null);

  // Depois de mover/redimensionar o foco volta ao botão usado (ou ao mosaico, se o botão ficou desativado).
  useEffect(() => {
    const f = refocus.current;
    if (!f) return;
    refocus.current = null;
    const section = document.querySelector<HTMLElement>(`section[data-tile="${f.id}"]`);
    const btn = Array.from(section?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((b) => b.getAttribute('aria-label') === f.label);
    (btn && !btn.disabled ? btn : section)?.focus();
  }, [layout]);

  const edit = (next: TileLayout[], id: string, what: string) => {
    setLayout(next);
    const pos = next.findIndex((t) => t.id === id) + 1;
    const t = next.find((x) => x.id === id)!;
    setAnnouncement(`${titleOf(id)}: ${what}. Posição ${pos} de ${next.length}, largura ${t.w} de 12, altura ${t.h} de 8.`);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const full = mergePage(persisted.current.full, page, layout);
      const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ layout: full }) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Não foi possível guardar.');
      persisted.current = { full, page: layout };
      setEditing(false);
      setAnnouncement(`Disposição guardada para o perfil ${profileLabel}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setLayout(persisted.current.page);
    setEditing(false);
    setError(null);
    setAnnouncement('Edição cancelada; disposição anterior restaurada.');
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Não foi possível repor a disposição.');
      const def = reconcile(undefined, page);
      persisted.current = { full: undefined, page: def };
      setLayout(def);
      setEditing(false);
      setAnnouncement(`Disposição por defeito reposta para o perfil ${profileLabel}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível repor a disposição.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tile-page" data-page={page}>
      <div role="toolbar" aria-label="Disposição do dashboard" className="tile-toolbar">
        <span>Perfil: {profileLabel}</span>
        {editing ? (
          <>
            <strong role="note">Modo de edição ativo: arraste os mosaicos ou use os botões de cada mosaico.</strong>
            <button type="button" onClick={save} disabled={busy}>Guardar</button>
            <button type="button" onClick={cancel} disabled={busy}>Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} aria-pressed={false}>Editar disposição</button>
        )}
        <button type="button" onClick={reset} disabled={busy}>Repor por defeito</button>
      </div>
      {error && <p role="alert" className="tile-error">{error}</p>}
      <TileGridView
        tiles={tiles}
        layout={layout}
        editing={editing}
        announcement={announcement}
        draggingId={draggingId}
        onMove={(id, dir) => {
          refocus.current = { id, label: `Mover ${titleOf(id)} para ${dir < 0 ? 'cima' : 'baixo'}` };
          edit(moveTile(layout, id, dir), id, dir < 0 ? 'movido para cima' : 'movido para baixo');
        }}
        onResize={(id, dim, d) => {
          const what = dim === 'w' ? (d < 0 ? 'mais estreito' : 'mais largo') : d < 0 ? 'mais baixo' : 'mais alto';
          refocus.current = { id, label: `Tornar ${titleOf(id)} ${what}` };
          edit(resizeTile(layout, id, dim, d), id, what);
        }}
        onDragStart={setDraggingId}
        onDropOn={(targetId) => {
          if (draggingId && draggingId !== targetId) {
            edit(moveTileTo(layout, draggingId, layout.findIndex((t) => t.id === targetId)), draggingId, 'movido');
          }
          setDraggingId(null);
        }}
        onDragEnd={() => setDraggingId(null)}
      />
    </div>
  );
}
