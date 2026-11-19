'use client';
import { CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUS_LABELS } from '../components/StatusIndicator';
import type { Status } from '../theme/tokens';
import type { AutonomyItem } from './autonomy';
import { scatterSeries } from './autonomy';

const SHAPES: Record<Status, 'circle' | 'triangle' | 'diamond'> = { ok: 'circle', atencao: 'triangle', critico: 'diamond' };

/**
 * Dispersão autonomia (Y) × tempo de reposição (X). A diagonal é a folga zero:
 * abaixo dela a autonomia é menor que o tempo de reposição (rutura prevista).
 * O estado distingue-se por forma e cor (nunca só cor).
 */
export function AutonomyScatter({ items }: { items: AutonomyItem[] }) {
  const { points, max } = scatterSeries(items);
  return (
    <div role="img" aria-label="Dispersão autonomia por tempo de reposição, com a diagonal de folga zero" style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Tempo de reposição" unit=" d" domain={[0, max]} label={{ value: 'Tempo de reposição (dias)', position: 'bottom' }} />
          <YAxis type="number" dataKey="y" name="Autonomia" unit=" d" domain={[0, max]} label={{ value: 'Autonomia (dias)', angle: -90, position: 'insideLeft' }} />
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: max, y: max }]}
            stroke="var(--text-muted)"
            strokeDasharray="6 4"
            label={{ value: 'Folga zero', position: 'insideTopLeft' }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(v) => (typeof v === 'number' ? v.toLocaleString('pt-PT', { maximumFractionDigits: 1 }) : String(v))}
            labelFormatter={() => ''}
          />
          <Legend verticalAlign="top" />
          {(['critico', 'atencao', 'ok'] as Status[]).map((s) => (
            <Scatter key={s} name={STATUS_LABELS[s]} data={points[s]} shape={SHAPES[s]} fill={`var(--status-${s})`} isAnimationActive={false} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
