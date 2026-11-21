'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { parseFilterState, shouldCommitPeriod, updateSearch, type FilterKey, type FilterOptions, type FilterState } from './filters';


/** Sugestões de período a partir do intervalo de datas disponível (anos e trimestres). */
export function periodSuggestions(range: FilterOptions['dateRange']): string[] {
  if (!range.min || !range.max) return [];
  const y0 = Number(range.min.slice(0, 4));
  const y1 = Number(range.max.slice(0, 4));
  const out: string[] = [];
  for (let y = y0; y <= y1; y++) out.push(String(y), `${y}-Q1`, `${y}-Q2`, `${y}-Q3`, `${y}-Q4`);
  return out;
}

/** Barra de slicers (apresentação pura): período, artigo, tipo, fornecedor. */
export function FilterBarView({ options, state, onChange }: { options: FilterOptions | null; state: FilterState; onChange: (key: FilterKey, value: string) => void }) {
  const select = (key: FilterKey, label: string, entries: { value: string; label: string }[]) => (
    <label className="filter-field">
      {label}
      <select className="filter-control" value={state[key] ?? ''} onChange={(e) => onChange(key, e.target.value)}>
        <option value="">Todos</option>
        {entries.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>
    </label>
  );
  // Último período enviado: o URL só reflete o Enter depois da navegação, e o blur seguinte não deve repeti-la.
  const lastSent = useRef(state.periodo ?? '');
  lastSent.current = state.periodo ?? '';
  const commitPeriod = (value: string) => {
    if (!shouldCommitPeriod(value, state.periodo ?? '', lastSent.current)) return;
    lastSent.current = value.trim();
    onChange('periodo', value.trim());
  };
  return (
    <form
      aria-label="Filtros"
      data-testid="filter-bar"
      onSubmit={(e) => e.preventDefault()}
      className="filter-bar"
    >
      <label className="filter-field">
        Período
        <input
          key={state.periodo ?? ''}
          className="filter-control"
          name="periodo"
          list="periodo-sugestoes"
          defaultValue={state.periodo ?? ''}
          placeholder="ex.: 2025-Q3"
          title="2025, 2025-Q3, 2025-09 ou 2025-01-01..2025-03-31"
          size={24}
          onBlur={(e) => commitPeriod(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitPeriod(e.currentTarget.value)}
        />
        <datalist id="periodo-sugestoes">
          {periodSuggestions(options?.dateRange ?? { min: null, max: null }).map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      {select('artigo', 'Artigo', (options?.items ?? []).map((i) => ({ value: i.itemRef, label: i.itemRef })))}
      {select('tipo', 'Tipo', (options?.types ?? []).map((t) => ({ value: t, label: t })))}
      {select('fornecedor', 'Fornecedor', (options?.vendors ?? []).map((v) => ({ value: v.vendorId, label: `${v.vendorId} · ${v.name}` })))}
      {select('classe', 'Classe ABC', ['A', 'B', 'C'].map((c) => ({ value: c, label: c })))}
      {select('triagem', 'Triagem', ['1', '2', '3', '4', '5', '4,5'].map((n) => ({ value: n, label: n.length > 1 ? 'Níveis 4 e 5' : `Nível ${n}` })))}
      {options?.dateRange.min && (
        <small className="filter-range">
          Dados de {options.dateRange.min} a {options.dateRange.max}
        </small>
      )}
    </form>
  );
}

/** Liga os slicers ao URL: ler (useSearchParams) e escrever (router.replace) sem perder outros parâmetros. */
export function FilterBar({ options }: { options: FilterOptions | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onChange = (key: FilterKey, value: string) => {
    const search = updateSearch(params.toString(), key, value);
    router.replace(search ? `${pathname}?${search}` : pathname);
  };
  return <FilterBarView options={options} state={parseFilterState(params)} onChange={onChange} />;
}
