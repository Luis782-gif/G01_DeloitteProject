/// <reference types="node" />
/** Rodapé de qualidade dos dados: números e data da última atualização vêm de GET /api/meta/data-quality. */
interface DataQuality {
  lastRefreshAt: string | null;
  total: { read: number; treated: number; flagged: number; rejected: number; pctTreated: number; pctFlagged: number; pctRejected: number };
  byFile: { file: string; read: number; flagged: number; rejected: number }[];
}

const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';

async function fetchQuality(): Promise<DataQuality | null> {
  try {
    const res = await fetch(`${backend}/api/meta/data-quality`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as DataQuality) : null;
  } catch {
    return null;
  }
}

const fmtPct = (n: number) => `${n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

export async function QualityFooter() {
  const q = await fetchQuality();
  return (
    <footer aria-label="Qualidade dos dados" style={{ padding: 16, borderTop: '1px solid #ddd', fontSize: 14 }}>
      {!q || q.lastRefreshAt === null ? (
        <p data-testid="quality-summary">Qualidade dos dados indisponível: o ETL ainda não foi executado.</p>
      ) : (
        <details>
          <summary data-testid="quality-summary">
            Dados: {q.total.treated} tratados ({fmtPct(q.total.pctTreated)}), {q.total.flagged} assinalados (
            {fmtPct(q.total.pctFlagged)}), {q.total.rejected} rejeitados ({fmtPct(q.total.pctRejected)}). Última atualização:{' '}
            {new Date(q.lastRefreshAt).toLocaleString('pt-PT')}
          </summary>
          <ul>
            {q.byFile.map((f) => (
              <li key={f.file}>
                {f.file}: {f.read} lidos, {f.flagged} assinalados, {f.rejected} rejeitados
              </li>
            ))}
          </ul>
        </details>
      )}
    </footer>
  );
}
