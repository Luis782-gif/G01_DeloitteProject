'use client';
import { useState } from 'react';
import { KpiCard, type KpiCardProps } from '../components/KpiCard';
import { ExplainPanel } from './ExplainPanel';

/** KpiCard cujo botão (i) abre o painel "Como é calculado" do KPI `kpiId` (id da entrada no servidor). */
export function KpiCardWithInfo({ kpiId, ...card }: Omit<KpiCardProps, 'onInfo'> & { kpiId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="kpi-card-wrap">
      <KpiCard {...card} onInfo={() => setOpen((o) => !o)} />
      {open && <ExplainPanel kpiId={kpiId} onClose={() => setOpen(false)} />}
    </div>
  );
}
