import { DetailLink } from '../detail/DetailLink';
import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { CALENDAR_CAVEAT, DEPLETED_LABEL, fmtDate, monthGrids, type ShortageCalendar } from './calendar';

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const fmt1 = (n: number) => n.toFixed(1).replace('.', ',');

/**
 * Calendário de rutura iminente: grelha por mês (artigos por dia de esgotamento) e tabela equivalente
 * ordenada por data. O estado "já esgotado" tem texto e ícone, não só cor. Cada artigo abre o drill-through.
 */
export function CalendarView({ data }: { data: ShortageCalendar }) {
  const { items, noConsumption } = data;
  const grids = monthGrids(items);
  const depleted = items.filter((i) => i.alreadyDepleted).length;
  return (
    <section aria-label="Calendário de rutura iminente" data-testid="shortage-calendar">
      <h2>Calendário de rutura iminente</h2>
      <KpiCardWithInfo
        kpiId="calendar"
        label="Artigos a esgotar"
        value={String(items.length)}
        unit={`artigos com data prevista · ${depleted} já esgotado${depleted === 1 ? '' : 's'}`}
        status={depleted > 0 ? 'critico' : 'ok'}
      />
      <p data-testid="calendar-caveat">
        <strong>{CALENDAR_CAVEAT}</strong> A data é a do snapshot de referência mais a autonomia (em dias inteiros) e é só uma previsão.
        {data.cutoffDate && ` Data de corte: ${fmtDate(data.cutoffDate)}.`}
      </p>
      {items.length === 0 && <p>Nenhum artigo com consumo no período.</p>}
      {grids.map((g) => (
        <div key={g.key} data-testid="calendar-month">
          <h3>
            {g.label} ({g.total} artigo{g.total === 1 ? '' : 's'})
          </h3>
          <div role="grid" aria-label={`Rutura prevista em ${g.label}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(4.5rem, 1fr))', gap: 4 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} role="columnheader" style={{ fontWeight: 600 }}>
                {w}
              </div>
            ))}
            {g.cells.map((c, idx) =>
              c === null ? (
                <div key={`e${idx}`} role="gridcell" aria-hidden="true" />
              ) : (
                <div
                  key={c.date}
                  role="gridcell"
                  data-testid={c.items.length ? 'calendar-day-hit' : undefined}
                  style={{ border: c.items.length ? '2px solid currentColor' : '1px solid #8884', borderRadius: 4, padding: 4, minHeight: '3rem' }}
                >
                  <div>{c.day}</div>
                  {c.items.length > 0 && (
                    <div>
                      <strong>
                        {c.items.length} esgota{c.items.length === 1 ? '' : 'm'}
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {c.items.map((i) => (
                          <li key={i.itemRef}>
                            <DetailLink kind="artigo" itemRef={i.itemRef}>
                              {i.name}
                            </DetailLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      ))}
      <h3>Lista por data de esgotamento</h3>
      <table data-testid="calendar-table">
        <caption>Data prevista de esgotamento por artigo (assume consumo constante)</caption>
        <thead>
          <tr>
            <th scope="col">Data de esgotamento</th>
            <th scope="col">Artigo</th>
            <th scope="col">Autonomia (dias)</th>
            <th scope="col">Snapshot de referência</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.itemRef} data-status={i.alreadyDepleted ? 'critico' : undefined}>
              <td>{fmtDate(i.depletionDate)}</td>
              <td>
                <DetailLink kind="artigo" itemRef={i.itemRef} />
              </td>
              <td>{fmt1(i.autonomyDays)}</td>
              <td>{fmtDate(i.referenceDate)}</td>
              <td>
                {i.alreadyDepleted ? <span><span aria-hidden="true">▲ </span>{DEPLETED_LABEL}</span> : 'Previsto'}
                {i.stale && !i.alreadyDepleted && ' · snapshot desatualizado'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {noConsumption.length > 0 && (
        <div data-testid="calendar-no-consumption">
          <h3>Sem consumo ({noConsumption.length})</h3>
          <p>Sem data de esgotamento: o consumo médio diário é zero.</p>
          <ul>
            {noConsumption.map((i) => (
              <li key={i.itemRef}>
                <DetailLink kind="artigo" itemRef={i.itemRef}>
                  {i.name}
                </DetailLink>{' '}
                — sem consumo
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
