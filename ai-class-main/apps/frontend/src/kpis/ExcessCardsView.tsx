import { KpiCard } from '../components/KpiCard';
import { fmtEur, fmtPct, type ExcessCapital, type IdleStock } from './excess';

/** Cartões K7 (capital em excesso, com estado) e K7b (stock parado, informativo). Nunca se somam. */
export function ExcessCardsView({ excess, idle, error }: { excess: ExcessCapital | null; idle: IdleStock | null; error?: string }) {
  if (error) return <p role="alert" data-testid="excess-invalid-filter">Filtro inválido: {error}</p>;
  if (!excess || !idle) return <p data-testid="excess-unavailable">Capital em excesso e stock parado: indisponível (a API não respondeu).</p>;
  const without = Math.max(excess.itemsWithoutData, idle.itemsWithoutData);
  return (
    <section aria-label="Capital em excesso e stock parado">
      <KpiCard label="Capital em excesso" value={fmtPct(excess.pct)} unit="% do valor de stock" status={excess.status} />
      <p data-testid="excess-summary">
        {fmtEur(excess.valueEur)} em {excess.itemsAbove} artigo{excess.itemsAbove === 1 ? '' : 's'} acima do máximo
      </p>
      <article aria-label="Stock parado" data-testid="idle-stock">
        <h3>Stock parado</h3>
        <p>
          <span className="kpi-value">{fmtEur(idle.valueEur)}</span>
        </p>
        <p>
          {idle.itemsOver} artigo{idle.itemsOver === 1 ? '' : 's'} com autonomia superior a {idle.days} dias (vista informativa, não se soma ao capital em excesso)
        </p>
      </article>
      {without > 0 && (
        <p data-testid="items-without-data">
          {without} artigo{without === 1 ? '' : 's'} sem dados no período
        </p>
      )}
    </section>
  );
}
