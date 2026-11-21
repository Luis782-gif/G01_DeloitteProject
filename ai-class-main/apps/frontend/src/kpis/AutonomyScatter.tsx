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
  const { points } = scatterSeries(items);
  const all = [...points.ok, ...points.atencao, ...points.critico];
  // O eixo X vai até ao maior tempo de reposição; o Y é cortado a 3× esse valor para a diagonal (folga zero)
  // não ficar esmagada no canto pelos poucos artigos com autonomias de centenas de dias (indicados por baixo).
  const xMax = Math.ceil(Math.max(5, ...all.map((p) => p.x)) / 5) * 5;
  const yMax = xMax * 3;
  const above = all.filter((p) => p.y > yMax).length;
  return (
    <>
    <div role="img" aria-label="Dispersão autonomia por tempo de reposição, com a diagonal de folga zero" style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis type="number" dataKey="x" name="Tempo de reposição" unit=" d" domain={[0, xMax]} label={{ value: 'Tempo de reposição (dias)', position: 'bottom' }} />
          <YAxis type="number" dataKey="y" name="Autonomia" unit=" d" domain={[0, yMax]} allowDataOverflow label={{ value: 'Autonomia (dias)', angle: -90, position: 'insideLeft' }} />
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: xMax, y: xMax }]}
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
    {above > 0 && (
      <p data-testid="scatter-above">
        {above} artigo{above === 1 ? '' : 's'} com autonomia acima de {yMax} dias (fora da escala, folga muito positiva).
      </p>
    )}
    </>
  );
}
