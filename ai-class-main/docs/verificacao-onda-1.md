# Verificação da onda 1

Estado de cada critério da spec (secção 12.6, só os da onda 1; AC-41 e a triagem ficam para a onda 2) e da checklist do enunciado. Os caminhos são relativos a `ai-class-main/`; `backend/` = `apps/backend/test/`, `frontend/` = `apps/frontend/src/`.

## KPI mínimos (valores calculados à mão, spec 12.1 a 12.3)

| KPI | Teste | Valor à mão |
|---|---|---|
| Abaixo do mínimo (K5) | `backend/below-minimum.spec.ts` "F1 (spec 12.1)" | 2 de 4 elegíveis, 1 excluído, 50 % |
| Tempo médio de reposição (K3) | `backend/lead-time.spec.ts` "F1 (spec 12.1): média global 14,4" | 14,4 dias |
| Rotação (K2) | `backend/rotation.spec.ts` "F2 (spec 12.2)" | 14,274 (anualizada 57,89) |
| ABC (K4) | `backend/abc.spec.ts` "F1..." (80/95) e "exemplo da aula... 66/91" | F1: A={310,457}, B={418}, C={419,346}; aula: A={2,5}, B={8,3}, C={1,4,7,6} |
| Autonomia (K1) | `backend/autonomy.spec.ts` "F1: autonomias por artigo e mediana 2,644" | 1,82; 1,32; 9,73; 5,61; 2,64 |

Validação independente em dados reais: os valores de referência da spec 6.2 foram obtidos a partir dos CSV, fora do código da aplicação, e são reproduzidos pela API em `backend/real-data.spec.ts`.

## Critérios de aceitação

| AC | Estado | Evidência |
|---|---|---|
| AC-01 ETL idempotente, regista `etl_run` | ✓ | `backend/data-quality.spec.ts` "idempotente..."; `backend/five-files.spec.ts` "idempotente..." |
| AC-02 ETL não altera os CSV | ✓ | `backend/data-quality.spec.ts` "não altera os CSV de origem (hash antes e depois)" |
| AC-03 2003 / 906 / 1097 / 0 | ✓ | `backend/real-data.spec.ts` "AC-03" (só com os CSV reais); `backend/five-files.spec.ts` para a soma dos 5 ficheiros |
| AC-04 rodapé = `etl_run` | ✓ (sem teste de componente) | O rodapé (`frontend/app/quality-footer.tsx`) lê `GET /api/meta/data-quality`, testado em `backend/data-quality.spec.ts`; confirmado no browser (906 tratados, 1097 assinalados, 0 rejeitados, data da última atualização) |
| AC-10 consistência entre visuais | ✓ | `frontend/filters/filters.test.ts` "o mesmo estado produz o mesmo pedido à API"; `backend/insights.spec.ts` "os números... coincidem com os KPI com o mesmo filtro" |
| AC-11 filtros no URL | ✓ | `frontend/filters/filters.test.ts` (leitura e escrita do URL); `frontend/filters/FilterBar.test.tsx` "refletem o estado vindo do URL" |
| AC-12 artigo sem snapshots não é zero | ✓ | `backend/filters.spec.ts` "artigo sem snapshots no período..."; `frontend/kpis/without-data.test.tsx` |
| AC-13 classe ABC estável | ✓ | `backend/abc.spec.ts` "AC-13..." |
| AC-20 `min > max` fora de K5, dentro dos restantes | ✓ | `backend/below-minimum.spec.ts` (excluídos = 1); `backend/excess-capital.spec.ts` "o registo R11... entra"; o F1 em autonomia, tempo de reposição e ABC inclui a linha 457 |
| AC-21 consumo 0 | ✓ | `backend/autonomy.spec.ts` "consumo 0: autonomia nula..." |
| AC-22 tendência com nº de snapshots e lacunas | ✓ | `backend/trend.spec.ts` (mês sem snapshots = nulo); `frontend/kpis/trend.test.tsx` "tooltip de lacuna" |
| AC-30 conclusão numérica P1, P2, P5 | ✓ | `backend/insights.spec.ts` (frases com valores); P5 em `backend/vendors.spec.ts` "nenhum fornecedor se distingue"; vista no browser |
| AC-40 valores de referência com dados completos | ✓ | `backend/real-data.spec.ts` (29/50, 19 acima do máximo, 236 614 283 € = 19,9 %, 1 187 053 873 €, 6 artigos e 112 653 424 € parados, ABC 24/13/13, abaixo do mínimo 2 de 47 com 3 excluídos) |

## Checklist do enunciado

| Requisito | Estado | Onde |
|---|---|---|
| Página principal + 3 subpáginas | ✓ | `/`, `/onde-doi`, `/porque`, `/receita` (`frontend/app/pages.test.ts`); a Receita é um esqueleto (onda 3) |
| Filtros consistentes | ✓ | `FilterBar` no layout, estado no URL, `fetchWithFilters` em todos os visuais |
| Comparação temporal | ✓ | Tendência mensal com mês anterior e variação (`GET /api/kpis/trend`) |
| Tooltip, drill-down, drill-through | ✓ | Tooltips recharts; Tipo → Artigo nas barras de excesso; painel `?detalhe=` |
| ETL reprodutível | ✓ | `npm run etl`, AC-01 e AC-02 |
| Indicadores e filtros no servidor | ✓ | SQL no NestJS; `frontend/app/pages.test.ts` "o frontend não acede à base de dados nem lê CSV" |
| Testes dos KPI mínimos | ✓ | tabela acima |
| Configuração por variáveis de ambiente | ✓ | `.env.example` (`DATABASE_URL`, `BACKEND_PORT`, `BACKEND_URL`, `DATA_DIR`) |

## Limitações visíveis na aplicação

Os painéis "Como é calculado" (`GET /api/kpis/<id>/explain`) declaram o custo unitário aleatório, as cerca de 10 observações por artigo, o consumo constante e a aproximação da rutura por folga negativa; o rodapé mostra a qualidade dos dados.

## Verificação visual (Playwright/Chromium headless, dados reais)

Vistas `/`, `/onde-doi`, `/porque`, `/receita`, `/?tipo=Equipment&periodo=2025` e `/?detalhe=artigo:108:xray-machine`, nos modos Consulta e Bloco operatório (1440 px): sem erros de consola; gráficos recharts a renderizar (tendência, dispersão, Pareto, barras de excesso); o painel de drill-through abre; o rodapé de qualidade é visível. Defeitos por tratar (não bloqueiam a onda 1): layout de uma coluna com cartões a toda a largura; a tabela de rotação lista os 50 artigos sem paginação; a escala da dispersão é dominada por 3 pontos extremos (eixo até 385 d), deixando a maioria junto à origem; o painel de detalhe mostra os campos de resumo numa coluna estreita; a página Receita ainda não tem gráficos (onda 3). `next build` compila.
