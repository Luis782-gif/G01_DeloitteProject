/** As 4 páginas da narrativa (spec §7.2) e a pergunta a que cada uma responde, mostrada por baixo do título. */
export const PAGES = [
  { href: '/', title: 'Pulso do hospital', question: 'O diagnóstico: como está o stock hoje? (P1, P2, P5)' },
  { href: '/onde-doi', title: 'Onde dói', question: 'Os sintomas: que artigos vão romper e onde está o capital parado? (P1, P2)' },
  { href: '/porque', title: 'Porquê', question: 'As causas: que fornecedores comprometem a disponibilidade? (P5)' },
  { href: '/receita', title: 'Receita', question: 'O tratamento: o que encomendar, o que suspender e quanto se liberta. (P1, P2)' },
] as const;

export type PageHref = (typeof PAGES)[number]['href'];
