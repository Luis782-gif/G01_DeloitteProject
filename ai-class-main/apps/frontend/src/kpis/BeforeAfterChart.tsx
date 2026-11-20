'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { barData, fmtEur2, type BeforeAfter } from './before-after';

/** Duas barras (antes, depois) do valor de stock; os valores vêm também numa tabela acessível. */
export function BeforeAfterChart({ data }: { data: BeforeAfter }) {
  const rows = barData(data);
  return (
    <div style={{ width: '100%', height: 240 }} role="img" aria-label={`Valor de stock antes ${fmtEur2(data.before)} e depois ${fmtEur2(data.after)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1e6)} M€`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip formatter={(v) => [fmtEur2(Number(v)), 'Valor de stock']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <Bar dataKey="value" name="Valor de stock" isAnimationActive={false}>
            <LabelList dataKey="value" position="top" formatter={(v) => fmtEur2(Number(v))} fill="var(--text)" fontSize={12} />
            {rows.map((r) => (
              <Cell key={r.name} fill={r.name === 'Antes' ? 'var(--text-muted)' : 'var(--accent, #2a7ab0)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
