'use client';

import { useCrossFilter } from '../filters/CrossFilter';
import { Bar, Cell, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ParetoRow } from './abc';

const eur = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 0 });

/** Pareto ABC: barras de valor de stock (eixo esquerdo) e linha da % acumulada (eixo direito, 0-100). */
export function AbcParetoChart({ rows }: { rows: ParetoRow[] }) {
  const { state, toggle } = useCrossFilter();
  return (
    <div style={{ width: '100%', height: 320 }} role="img" aria-label="Pareto ABC: valor de stock por artigo e percentagem acumulada">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="itemRef" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={90} />
          <YAxis yAxisId="valor" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={eur} />
          <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip
            formatter={(v, name) => (name === 'Valor de stock' ? `${eur(Number(v))} €` : `${v} %`)}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <Bar
            yAxisId="valor"
            dataKey="value"
            name="Valor de stock"
            fill="var(--text-muted)"
            cursor="pointer"
            onClick={(row) => toggle('classe', (row as unknown as ParetoRow).class)}
          >
            {rows.map((r) => (
              <Cell key={r.itemRef} stroke={state.classe === r.class ? 'var(--text)' : 'none'} strokeWidth={state.classe === r.class ? 3 : 0} />
            ))}
          </Bar>
          <Line yAxisId="pct" dataKey="cumPct" name="% acumulada" stroke="var(--text)" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
