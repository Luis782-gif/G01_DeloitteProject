'use client';

import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { barRows, fmtEur, type ExcessCapital } from './excess';

/**
 * Barras de excesso (K7) com drill-down Tipo → Artigo: clicar na barra (ou no botão) do tipo
 * expande para os artigos desse tipo; clicar de novo recolhe. Os dados já vêm filtrados da API.
 * A tabela por baixo é a alternativa acessível do gráfico.
 */
export function ExcessBarsView({ data, initialExpanded = null }: { data: ExcessCapital; initialExpanded?: string | null }) {
  const [expanded, setExpanded] = useState<string | null>(initialExpanded);
  const toggle = (type: string) => setExpanded((cur) => (cur === type ? null : type));

  if (data.byType.length === 0) return <p>Nenhum artigo acima do máximo.</p>;
  const rows = barRows(data.byType, expanded);

  return (
    <section aria-label="Excesso por artigo" data-testid="excess-bars">
      <h2>Excesso acima do máximo</h2>
      <div style={{ width: '100%', height: 60 + rows.length * 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 24, right: 24 }}>
            <XAxis type="number" tickFormatter={(v: number) => `${Math.round(v / 1e6)} M€`} />
            <YAxis type="category" dataKey="label" width={140} />
            <Tooltip formatter={(v) => fmtEur(Number(v))} />
            <Bar dataKey="valueEur" onClick={(row) => toggle((row as unknown as { type: string }).type)} cursor="pointer" isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.level === 'tipo' ? '#1F6E7E' : '#9CCDD6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Tipo / artigo</th>
            <th scope="col">Excesso (€)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} data-level={r.level}>
              <td>
                {r.level === 'tipo' ? (
                  <button type="button" aria-expanded={r.type === expanded} onClick={() => toggle(r.type)}>
                    {r.label}
                  </button>
                ) : (
                  <span style={{ paddingLeft: 24 }}>{r.label}</span>
                )}
              </td>
              <td>{fmtEur(r.valueEur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
