'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { closeDetailHref, detailApiPath, DETAIL_KEY, parseDetail } from './detail';

export interface ItemSnapshot {
  date: string;
  stock: number;
  min: number;
  max: number;
  autonomyDays: number | null;
  leadTimeDays: number;
  unitCost: number;
  vendorId: string;
}
export interface ItemDetail {
  itemRef: string;
  itemId: number;
  name: string;
  abcClass: string | null;
  stale: boolean;
  itemsWithoutData: number;
  reference: (ItemSnapshot & { slackDays: number | null; stale: boolean }) | null;
  history: ItemSnapshot[];
}
export interface VendorDetail {
  vendorId: string;
  name: string;
  itemSupplied: string;
  declaredLeadTimeDays: number;
  datesLeadTimeDays: number;
  lastOrderDate: string;
  nextDeliveryDate: string;
  leadTime: { mean: number | null; stdDev: number | null; cv: number | null; observations: number };
}
export type Detail = { kind: 'artigo'; data: ItemDetail } | { kind: 'fornecedor'; data: VendorDetail };

const fmt = (n: number | null, digits = 2) => (n === null ? 'n/d' : n.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: digits }));

const panelStyle = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)', overflowY: 'auto', zIndex: 20, padding: 16,
  background: 'var(--surface)', color: 'var(--text)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 12px rgba(0,0,0,.2)',
} as const;

function ItemBody({ d }: { d: ItemDetail }) {
  const r = d.reference;
  return (
    <>
      {d.stale && <p data-testid="detail-stale"><strong>Desatualizado</strong>: o último snapshot tem mais de 90 dias face à data de corte.</p>}
      {d.itemsWithoutData > 0 && <p data-testid="items-without-data">Sem snapshots no período selecionado.</p>}
      <dl>
        <dt>Classe ABC</dt>
        <dd>{d.abcClass ?? 'n/d'}</dd>
        {r && (
          <>
            <dt>Snapshot de referência</dt>
            <dd>{r.date}</dd>
            <dt>Autonomia (dias)</dt>
            <dd>{fmt(r.autonomyDays)}</dd>
            <dt>Dias de folga</dt>
            <dd>{fmt(r.slackDays)}</dd>
          </>
        )}
      </dl>
      {d.history.length > 0 && (
        <table data-testid="detail-history">
          <caption>Histórico de snapshots</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Stock</th>
              <th scope="col">Mínimo</th>
              <th scope="col">Máximo</th>
              <th scope="col">Autonomia (dias)</th>
              <th scope="col">Tempo de reposição (dias)</th>
              <th scope="col">Custo unitário (€)</th>
            </tr>
          </thead>
          <tbody>
            {d.history.map((h) => (
              <tr key={h.date}>
                <td>{h.date}</td>
                <td>{h.stock}</td>
                <td>{h.min}</td>
                <td>{h.max}</td>
                <td>{fmt(h.autonomyDays)}</td>
                <td>{h.leadTimeDays}</td>
                <td>{fmt(h.unitCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function VendorBody({ d }: { d: VendorDetail }) {
  const lt = d.leadTime;
  return (
    <dl>
      <dt>Artigo declarado</dt>
      <dd>{d.itemSupplied}</dd>
      <dt>Prazo declarado (dias)</dt>
      <dd>{d.declaredLeadTimeDays}</dd>
      <dt>Prazo pelas datas (dias)</dt>
      <dd>
        {d.datesLeadTimeDays} ({d.lastOrderDate} a {d.nextDeliveryDate})
      </dd>
      <dt>Tempo de reposição no inventário</dt>
      <dd>
        {lt.observations === 0
          ? 'Sem snapshots deste fornecedor no período.'
          : `média ${fmt(lt.mean)} dias · desvio ${fmt(lt.stdDev)} · CV ${fmt(lt.cv, 3)} · ${lt.observations} snapshots`}
      </dd>
    </dl>
  );
}

/** Apresentação pura do painel lateral. Sem `detail` e sem `error` = a carregar. */
export function DetailView({ detail, error, onClose }: { detail?: Detail; error?: string; onClose: () => void }) {
  const title = detail ? (detail.kind === 'artigo' ? detail.data.name : detail.data.name) : 'Detalhe';
  const sub = detail ? (detail.kind === 'artigo' ? detail.data.itemRef : detail.data.vendorId) : '';
  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="detail-title" data-testid="detail-panel" style={panelStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <h2 id="detail-title" style={{ margin: 0 }}>
          {title} <small style={{ color: 'var(--text-muted)' }}>{sub}</small>
        </h2>
        <button type="button" onClick={onClose} aria-label="Fechar" data-detail-close>
          Fechar
        </button>
      </header>
      {error ? <p role="alert">{error}</p> : !detail ? <p>A carregar...</p> : detail.kind === 'artigo' ? <ItemBody d={detail.data} /> : <VendorBody d={detail.data} />}
    </aside>
  );
}

/** Painel ligado ao URL: abre quando `?detalhe=` existe; Esc/Fechar remove-o e mantém os filtros; foco gerido. */
export function DetailPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ref = parseDetail(params.get(DETAIL_KEY));
  const key = ref ? `${ref.kind}:${ref.ref}` : '';
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState<string>();
  const opener = useRef<HTMLElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const paramsString = params.toString();

  const close = () => router.replace(closeDetailHref(paramsString, pathname), { scroll: false });

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    setDetail(undefined);
    setError(undefined);
    fetch(detailApiPath(ref, new URLSearchParams(paramsString)))
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setDetail({ kind: ref.kind, data: body } as Detail);
        else setError((body as { error?: string }).error ?? 'Não foi possível obter o detalhe.');
      })
      .catch(() => !cancelled && setError('Não foi possível obter o detalhe (a API não respondeu).'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, paramsString.replace(/(^|&)detalhe=[^&]*/, '')]);

  useEffect(() => {
    if (!key) return;
    opener.current = document.activeElement as HTMLElement | null;
    container.current?.querySelector<HTMLElement>('[data-detail-close]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!ref) return null;
  return (
    <div ref={container}>
      <DetailView detail={detail} error={error} onClose={close} />
    </div>
  );
}
