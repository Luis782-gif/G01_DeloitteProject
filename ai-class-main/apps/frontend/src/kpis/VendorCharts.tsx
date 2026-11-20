'use client';
import { Bar, BarChart, CartesianGrid, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MONTHS, type Vendors } from './vendors';

const fmt = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('pt-PT', { maximumFractionDigits: 1 }) : String(v));

/** Barras do tempo médio de reposição por fornecedor, com intervalo média ± desvio-padrão. A tabela é a alternativa acessível. */
export function LeadTimeIntervalChart({ vendors }: { vendors: Vendors['vendors'] }) {
  const rows = vendors.filter((v) => v.mean !== null).map((v) => ({ name: v.vendorId, mean: v.mean, sd: v.stdDev ?? 0 }));
  return (
    <div role="img" aria-label="Tempo médio de reposição por fornecedor, com intervalo de média mais ou menos desvio-padrão" style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis unit=" d" />
          <Tooltip formatter={fmt} />
          <Bar dataKey="mean" name="Média (dias)" fill="#1F6E7E" isAnimationActive={false}>
            <ErrorBar dataKey="sd" width={6} stroke="#333" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeasonalityChart({ data }: { data: Vendors['seasonality'] }) {
  const rows = data.map((r) => ({ name: MONTHS[r.month - 1], mean: r.mean }));
  return (
    <div role="img" aria-label="Tempo médio de reposição por mês do ano" style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis unit=" d" />
          <Tooltip formatter={fmt} />
          <Bar dataKey="mean" name="Média (dias)" fill="#9CCDD6" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
