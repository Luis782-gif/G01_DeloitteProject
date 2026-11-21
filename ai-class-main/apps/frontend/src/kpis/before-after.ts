/** Resposta de GET /api/impact/before-after (spec 8.4). */
export interface BeforeAfter {
  before: number;
  after: number;
  released: number;
  releasedPct: number;
  itemsAboveMax: number;
}

/** Montante em € em PT-PT, com cêntimos (ex.: 90 098 726,90 €). */
export const fmtEur2 = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtPct2 = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Texto de resumo: "libertado: X (Y %)". */
export const releasedText = (d: BeforeAfter) => `libertado: ${fmtEur2(d.released)} (${fmtPct2(d.releasedPct)} %)`;

/** Duas barras do gráfico. */
export const barData = (d: BeforeAfter) => [
  { name: 'Antes', value: d.before },
  { name: 'Depois', value: d.after },
];
