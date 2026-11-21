# Verificação final (ondas 2 e 3 + revisão do desenho)

Continua `docs/verificacao-onda-1.md`. Caminhos relativos a `ai-class-main/`; `backend/` = `apps/backend/test/`, `frontend/` = `apps/frontend/src/`.

Estado em 2026-11-21: `npm run typecheck` sem erros; `npm test` = **179 testes do backend (23 suites) + 121 do frontend, todos a passar**, com os 5 CSV reais em `data/` (os testes AC-03/AC-40 correm sobre eles). Tudo foi também confirmado no browser, a 1440 × 900 e a 375 px (sem scroll horizontal), nos modos Consulta e Bloco operatório.

## Onda 2 e onda 3 (tickets)

| Ticket | Teste que o prova | Verificado no browser |
|---|---|---|
| #19 Triagem 1–5 | `backend/triage.spec.ts` (AC-41: 5 / 9 / 2 / 24 / 10), `frontend/kpis/triage.test.tsx` | Distribuição no Pulso; clicar num nível filtra a página (`?triagem=4`) e os KPI recalculam |
| #20 Calendário de rutura | `backend/shortage-calendar.spec.ts`, `frontend/kpis/calendar.test.tsx` | Onde dói, meses em grelha + lista |
| #21 Cabeçalho ECG | `frontend/ecg/ecg.test.tsx` | "10 artigos em nível 5" no cabeçalho; parado com `prefers-reduced-motion` |
| #22 Receita: sugestão de encomenda e CSV | `backend/reorder-suggestions.spec.ts` (o CSV tem o mesmo conteúdo da lista), `frontend/kpis/reorder.test.tsx` | 36 artigos a encomendar; botão "Exportar lista de compras" |
| #23 Antes vs. depois | `backend/before-after.spec.ts` (F1: libertado 12 945 643,47 €, 14,37 %) | 236 614 283,06 € libertados (19,93 %) com os dados completos |
| #24 Simulador "E se…?" | `backend/simulations.spec.ts` (LT +1 → folga −0,917, nível 4 → 5) | Consumo +30 % → 5 artigos passam a folga negativa (29 → 34) |
| #25 Pesquisa global (Ctrl+K) | `backend/search.spec.ts`, `frontend/search/search.test.tsx` | Ctrl+K, "V002" → EquipMed Co. → drill-through |
| #26 Layouts por perfil | `backend/layouts.spec.ts`, `frontend/layout/layout.test.tsx` | Editar disposição / Guardar / Cancelar / Repor por defeito |

## Revisão do desenho (spec §19)

| Alteração | Teste |
|---|---|
| Faixa de 8 KPI no topo do Pulso (5 mínimos + folga, rutura prevista, capital em excesso), "n/d" sem API | `frontend/kpis/kpi-strip.test.tsx` |
| Classe A = % acumulada da última linha A (aula: 66,67 %) | `frontend/kpis/kpi-strip.test.tsx` "classAShare" |
| Larguras por defeito topo/meio/fim, linhas completas de 12 colunas | `frontend/layout/layout.test.tsx` |
| Triagem dividida em gráfico (meio) e tabela (fim) | `frontend/kpis/triage.test.tsx` "part" |
| Abaixo do mínimo sem cartão repetido no Pulso | `frontend/kpis/without-data.test.tsx` "showCard=false" |
| Porquê: maior atraso face ao prometido (V002: +14), pior índice, mais artigos em risco | `frontend/kpis/vendors.test.tsx` "topo da página" |
| (i) do K5 "abaixo do mínimo" | `backend/autonomy.spec.ts` "GET /api/kpis/:id/explain" (registo de entradas) |

## Checklist do enunciado

| Requisito | Onde |
|---|---|
| Next.js → NestJS → PostgreSQL; o browser só fala com a API | `frontend/app/pages.test.ts` "o frontend não acede à base de dados nem lê CSV" |
| ETL reprodutível, CSV inalterados | `npm run etl`; `backend/data-quality.spec.ts` (hash antes e depois) |
| Página principal + 3 subpáginas com navegação | Separadores Pulso / Onde dói / Porquê / Receita; os filtros acompanham a navegação |
| 5 KPI mínimos + adicionais, justificados | Faixa de KPI do Pulso; painel (i) "Como é calculado" em cada KPI; spec §6 |
| Filtros dinâmicos consistentes | Barra de filtros global, estado no URL, cross-filter (triagem, classe ABC, excesso por tipo) |
| Comparação ao longo do tempo | Tendência mensal com mês vs. mês anterior (Pulso) |
| Tooltip, drill-down, drill-through | Tooltips dos gráficos; excesso Tipo → Artigo (Onde dói); painel lateral do artigo / fornecedor |
| Testes automáticos dos KPI mínimos | `backend/below-minimum`, `lead-time`, `abc` (exemplo da aula), `rotation`, `autonomy` `.spec.ts` |
| Configuração em variáveis de ambiente | `.env.example`; nada de credenciais no código |
| README com instruções | `README.md`, secção "Executar a aplicação" |
