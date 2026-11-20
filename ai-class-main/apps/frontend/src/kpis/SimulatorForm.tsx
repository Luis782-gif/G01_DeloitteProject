'use client';
import { useState, type FormEvent } from 'react';
import type { FilterState } from '../filters/filters';
import { SimulatorResultView } from './SimulatorResultView';
import { clamp, MAX_LEAD_TIME_DELTA_DAYS, MAX_USAGE_DELTA_PCT, simulationBody, simulationHref, type SimulationResult } from './simulator';

/** Controlo com `<input type="range">` rotulado e o mesmo valor num campo numérico. */
function Control({ id, label, unit, max, value, onChange }: { id: string; label: string; unit: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="simulator-control">
      <label htmlFor={`${id}-range`}>{label}</label>
      <input id={`${id}-range`} type="range" min={0} max={max} step={1} value={value} onChange={(e) => onChange(clamp(Number(e.target.value), max))} />
      <input id={`${id}-number`} type="number" min={0} max={max} step={1} value={value} aria-label={`${label} (valor)`} onChange={(e) => onChange(clamp(Number(e.target.value), max))} />
      <span>{unit}</span>
    </div>
  );
}

/** Formulário do simulador "E se…?": envia o cenário a POST /api/simulations (proxy) com os filtros do URL. */
export function SimulatorForm({ filters, vendors }: { filters: FilterState; vendors: { vendorId: string; name: string }[] }) {
  const [days, setDays] = useState(0);
  const [pct, setPct] = useState(0);
  const [vendorId, setVendorId] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(simulationHref(filters), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationBody({ leadTimeDeltaDays: days, usageDeltaPct: pct, vendorId: vendorId || undefined })),
      });
      if (res.ok) setResult((await res.json()) as SimulationResult);
      else {
        setResult(null);
        setError(res.status === 400 ? (((await res.json()) as { error?: string }).error ?? 'Parâmetros inválidos.') : 'Simulador indisponível (a API não respondeu).');
      }
    } catch {
      setResult(null);
      setError('Simulador indisponível (a API não respondeu).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Simulador E se…?" data-testid="simulator-form">
      <Control id="sim-lt" label="Tempo de reposição sobe (dias)" unit="dias" max={MAX_LEAD_TIME_DELTA_DAYS} value={days} onChange={setDays} />
      <Control id="sim-usage" label="Consumo sobe (%)" unit="%" max={MAX_USAGE_DELTA_PCT} value={pct} onChange={setPct} />
      {vendors.length > 0 && (
        <div className="simulator-control">
          <label htmlFor="sim-vendor">Tempo de reposição só do fornecedor</label>
          <select id="sim-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Todos os fornecedores</option>
            {vendors.map((v) => (
              <option key={v.vendorId} value={v.vendorId}>{v.vendorId} {v.name}</option>
            ))}
          </select>
        </div>
      )}
      <button type="submit" disabled={busy}>{busy ? 'A simular…' : 'Simular'}</button>
      {error && <p role="alert" data-testid="simulator-error">{error}</p>}
      <div aria-live="polite">{result && <SimulatorResultView result={result} />}</div>
    </form>
  );
}
