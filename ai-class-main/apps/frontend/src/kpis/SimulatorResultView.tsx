import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import type { SimulationResult } from './simulator';

/** Resultado do simulador: folga negativa antes/depois e distribuição da triagem antes/depois (tabela acessível). */
export function SimulatorResultView({ result }: { result: SimulationResult }) {
  const count = (list: { level: number; count: number }[], level: number) => list.find((l) => l.level === level)?.count ?? 0;
  const levels = [1, 2, 3, 4, 5];
  return (
    <div data-testid="simulator-result">
      <KpiCardWithInfo
        kpiId="simulator"
        label="Artigos que passam a ter folga negativa"
        value={String(result.newNegativeSlack)}
        unit={`de ${result.itemsTotal} artigos`}
        status={result.newNegativeSlack === 0 ? 'ok' : 'atencao'}
      />
      <p data-testid="simulator-negative">
        Artigos com folga negativa: <strong>{result.negativeSlackBefore}</strong> antes, <strong>{result.negativeSlackAfter}</strong> depois
        ({result.newNegativeSlack} passam a ter folga negativa).
      </p>
      <div className="table-scroll"><table data-testid="simulator-triage">
        <caption>Distribuição dos artigos por nível de triagem, antes e depois</caption>
        <thead>
          <tr>
            <th scope="col">Nível de triagem</th>
            <th scope="col">Antes</th>
            <th scope="col">Depois</th>
            <th scope="col">Variação</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => {
            const b = count(result.triageBefore, l);
            const a = count(result.triageAfter, l);
            const d = a - b;
            return (
              <tr key={l}>
                <th scope="row">Nível {l}</th>
                <td>{b}</td>
                <td>{a}</td>
                <td>{d > 0 ? `+${d}` : String(d)}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </div>
  );
}
