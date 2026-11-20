'use client';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendTooltipBody } from './TrendTooltip';
import { monthLabel, type TrendPoint } from './trend';

/** Linha mensal; `connectNulls` desligado: os meses sem dados aparecem como interrupções. */
export function TrendChart({ points, label, unit }: { points: TrendPoint[]; label: string; unit: string }) {
  return (
    <div role="img" aria-label={`Gráfico de tendência: ${label}`} style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={monthLabel} />
          <YAxis unit={` ${unit}`} />
          <Tooltip content={(p) => (p.active && p.payload?.length ? <TrendTooltipBody point={p.payload[0].payload as TrendPoint} unit={unit} /> : null)} />
          <Line type="monotone" dataKey="value" name={label} stroke="var(--accent, #0b5cab)" connectNulls={false} dot isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
