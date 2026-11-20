'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCrossFilter } from '../filters/CrossFilter';
import { TONES } from '../theme/tokens';
import type { TriageBucket } from './triage';

/** Distribuição dos níveis 1 a 5; clicar numa barra aplica `triagem=N` (clicar de novo remove). */
export function TriageChart({ distribution }: { distribution: TriageBucket[] }) {
  const { state, toggle } = useCrossFilter();
  return (
    <div style={{ width: '100%', height: 220 }} role="img" aria-label="Distribuição dos artigos por nível de triagem, de 1 a 5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="level" tickFormatter={(l) => `Nível ${l}`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip formatter={(v) => [`${v} artigos`, 'Artigos']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <Bar dataKey="count" name="Artigos" cursor="pointer" label={{ position: 'top', fill: 'var(--text)', fontSize: 12 }} onClick={(b) => toggle('triagem', String((b as unknown as TriageBucket).level))}>
            {distribution.map((b) => (
              <Cell key={b.level} fill={TONES[b.level]} stroke={state.triagem === String(b.level) ? 'var(--text)' : TONES[5]} strokeWidth={state.triagem === String(b.level) ? 4 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
