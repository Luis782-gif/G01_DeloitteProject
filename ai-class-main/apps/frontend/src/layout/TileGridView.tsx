import type { CSSProperties, ReactNode } from 'react';
import { MAX_H, MAX_W, MIN_W, type TileLayout } from './model';

export interface TileMeta { id: string; title: string; node: ReactNode }

export interface TileGridViewProps {
  tiles: TileMeta[];
  layout: TileLayout[];
  editing: boolean;
  /** Texto para o leitor de ecrã (região aria-live) com a última alteração. */
  announcement: string;
  draggingId: string | null;
  onMove: (id: string, dir: -1 | 1) => void;
  onResize: (id: string, dim: 'w' | 'h', delta: number) => void;
  onDragStart: (id: string) => void;
  onDropOn: (targetId: string) => void;
  onDragEnd: () => void;
}

/** Desenho puro da grelha de mosaicos. Fora do modo de edição os mosaicos são estáticos: sem arrastar nem controlos. */
export function TileGridView(p: TileGridViewProps) {
  const byId = new Map(p.tiles.map((t) => [t.id, t]));
  const ordered = p.layout.filter((l) => byId.has(l.id));
  return (
    <div className="tile-grid" data-editing={p.editing ? 'true' : 'false'}>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {p.announcement}
      </div>
      {ordered.map((l, i) => {
        const t = byId.get(l.id)!;
        const style = { '--w': l.w, '--h': l.h } as CSSProperties;
        if (!p.editing) {
          return (
            <section key={l.id} className="tile" style={style} data-tile={l.id} aria-label={t.title}>
              {t.node}
            </section>
          );
        }
        return (
          <section
            key={l.id}
            className="tile tile-editing"
            style={style}
            data-tile={l.id}
            data-dragging={p.draggingId === l.id ? 'true' : 'false'}
            aria-label={t.title}
            tabIndex={-1}
            draggable
            onDragStart={() => p.onDragStart(l.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              p.onDropOn(l.id);
            }}
            onDragEnd={p.onDragEnd}
          >
            <div role="group" aria-label={`Disposição de ${t.title}`} className="tile-controls">
              <strong className="tile-title">
                <span aria-hidden="true">⠿ </span>
                {t.title}
              </strong>
              <span className="tile-size">
                Posição {i + 1} de {ordered.length} · Largura {l.w} de {MAX_W} · Altura {l.h} de {MAX_H}
              </span>
              <button type="button" aria-label={`Mover ${t.title} para cima`} disabled={i === 0} onClick={() => p.onMove(l.id, -1)}>
                Subir
              </button>
              <button type="button" aria-label={`Mover ${t.title} para baixo`} disabled={i === ordered.length - 1} onClick={() => p.onMove(l.id, 1)}>
                Descer
              </button>
              <button type="button" aria-label={`Tornar ${t.title} mais estreito`} disabled={l.w <= MIN_W} onClick={() => p.onResize(l.id, 'w', -1)}>
                − Largura
              </button>
              <button type="button" aria-label={`Tornar ${t.title} mais largo`} disabled={l.w >= MAX_W} onClick={() => p.onResize(l.id, 'w', 1)}>
                + Largura
              </button>
              <button type="button" aria-label={`Tornar ${t.title} mais baixo`} disabled={l.h <= 1} onClick={() => p.onResize(l.id, 'h', -1)}>
                − Altura
              </button>
              <button type="button" aria-label={`Tornar ${t.title} mais alto`} disabled={l.h >= MAX_H} onClick={() => p.onResize(l.id, 'h', 1)}>
                + Altura
              </button>
            </div>
            <div className="tile-body">{t.node}</div>
          </section>
        );
      })}
    </div>
  );
}
