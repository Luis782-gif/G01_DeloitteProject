# ISEP x Deloitte: Building Software with AI Agents

Starter workspace for the workshop. You will build a small analytics dashboard with Claude Code,
following a spec-driven workflow. Follow the guide `ISEP_Deloitte_practice_class.html` for the full session.

## What to install before the session

| Tool | Version | Why |
| --- | --- | --- |
| [VS Code](https://code.visualstudio.com/) | latest | Editor and integrated terminal |
| [Git](https://git-scm.com/downloads) | latest | Version control and team repository |
| [Node.js](https://nodejs.org/) (includes npm) | 24 LTS or newer | Runs the Next.js frontend and NestJS API |
| [Claude Code CLI](https://code.claude.com/docs/en/setup) | latest | The AI coding agent, run in the VS Code terminal |

### Check everything is installed

```powershell
node --version
npm --version
git --version
claude --version
```

All four commands must print a version. Node must be 24 or newer.

### Install Matt Pocock's skills

Install the official Claude Code plugin:

```bash
claude plugin install mattpocock-skills@claude-plugins-official
```

The plugin updates itself. After connecting Claude Code to the workshop API below, run
`/setup-matt-pocock-skills` once from the repository root to configure the skills for this repo.
See the [official skills repository](https://github.com/mattpocock/skills) for details.

## Connect Claude Code to the workshop API

Deloitte provides the workshop API URL and key

From the repository root:

In `.claude/settings.local.json`, set both `ANTHROPIC_FOUNDRY_BASE_URL` and
`ANTHROPIC_FOUNDRY_API_KEY` under `env`, using the URL and key provided by Deloitte. If you need
to create the file, use this structure and replace the empty values:

```json
{
  "env": {
    "ANTHROPIC_FOUNDRY_BASE_URL": "",
    "ANTHROPIC_FOUNDRY_API_KEY": "",
    "ANTHROPIC_MODEL": "claude-sonnet-5-5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-5-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-5-5",
    "DISABLE_NON_ESSENTIAL_MODEL_CALLS": "1",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_USE_FOUNDRY": "1"
  }
}
```

If the file already has an `env` object, add or update those entries there. Never put the URL or key
in `.claude/settings.json`.

Start `claude` from the repository root, run `/status` to confirm it is connected, then run
`/setup-matt-pocock-skills` once.

> **Keep the URL and key only in `.claude/settings.local.json`**, which is excluded from Git.
> The Claude hook in `.claude/settings.json` blocks Claude Code commits if staged files contain
> non-placeholder values for either variable. It does not guard commits made outside Claude Code.
> Do not share the key. Report a leak to the Deloitte facilitators immediately.

## Repository layout

- `apps/frontend`: frontend (Next.js), created during the workshop.
- `apps/backend`: backend (NestJS), created during the workshop.
- `docs`: the agreed specification.
- `data`: the original CSV files for your chosen assignment. Kept out of Git.
- `CLAUDE.md`: instructions that Claude Code reads automatically.
## Executar a aplicação (em português)

Requisitos: Node 24+ e npm. Não é preciso instalar PostgreSQL nem Docker: o PostgreSQL arranca por um pacote npm (ADR 0002).

```bash
npm install                 # uma só vez, na pasta ai-class-main
cp .env.example .env        # configuração (sem segredos); .env está no .gitignore
npm run db                  # terminal 1: PostgreSQL embedded (porta 54329, dados em apps/backend/.pgdata)
npm run dev:backend         # terminal 2: API em http://localhost:3001/api (aplica as migrações ao arrancar)
npm run dev:frontend        # terminal 3: aplicação em http://localhost:3000
```

Verificação: `http://localhost:3000/api/health` (via Next, que reencaminha `/api/*` para o backend) deve devolver `{"status":"ok",...}`.
O browser só fala com o Next; só o backend acede à base de dados e (no ETL, ticket #4) aos CSV em `DATA_DIR`.

Passos de ponta a ponta (primeira vez): `npm install --include=dev` (instala também o Jest e as ferramentas de teste), copiar `.env.example` para `.env`, colocar os 5 CSV em `data/` (ou apontar `DATA_DIR`), `npm run db`, `npm run etl`, `npm run dev:backend` e `npm run dev:frontend`; abrir `http://localhost:3000`. Para outro PostgreSQL em vez do embedded, ver "Outro PostgreSQL" abaixo.

| Serviço | Porta por defeito | Variável |
| --- | --- | --- |
| Frontend (Next.js) | 3000 | `next dev -p` |
| Backend (NestJS) | 3001 | `BACKEND_PORT` |
| PostgreSQL embedded | 54329 | `DEV_DB_PORT` |

### Variáveis de ambiente (`.env`, ver `.env.example`; sem segredos)

| Variável | Função |
| --- | --- |
| `DATABASE_URL` | Ligação ao PostgreSQL (backend e ETL) |
| `BACKEND_PORT` | Porta da API |
| `BACKEND_URL` | Para onde o Next reencaminha `/api/*` (servidor a servidor) |
| `DATA_DIR` | Pasta com os 5 CSV, lida só pelo ETL |

### Arquitetura

`browser → Next.js (frontend) → NestJS (API) → PostgreSQL`. O browser só fala com o Next; o Next reencaminha `/api/*` para o NestJS; só o NestJS acede à base de dados. Os CSV são lidos apenas pelo ETL, que os carrega para a base (estrela, 3NF). Todos os KPI, filtros e frases-insight são calculados no servidor, em SQL.

### Do agente ao código: spec → ticket → teste → código

1. **Spec**: `docs/spec.md` (objetivo, KPI, storyboard, contratos, critérios de aceitação AC-xx e conjuntos de teste calculados à mão na secção 12). O vocabulário está em `GLOSSARY.md` e as decisões difíceis de reverter em `docs/adr/` (0001 a 0003). Desvios da implementação: secção 17 da spec.
2. **Tickets**: GitHub Issues (`gh issue list`), um por fatia vertical, todos filhos da spec (#1). Cada ticket tem critérios de aceitação que citam os AC e os valores de `docs/spec.md`.
3. **Teste primeiro**: o critério vira um teste com o valor calculado à mão (`apps/backend/test/*.spec.ts` sobre a API real, `apps/frontend/src/**/*.test.ts(x)` para a interface), e só depois se escreve o código.
4. **Ligação ticket → teste**: o nome do teste cita o conjunto da spec (por exemplo "F1 (spec 12.1)") ou o AC. A verificação da onda 1, AC a AC, está em `docs/verificacao-onda-1.md`.

| Ticket | Critério (spec) | Teste que o prova |
| --- | --- | --- |
| #5 Abaixo do mínimo | F1: 2 de 4 elegíveis, 1 excluído, 50 % | `backend/below-minimum.spec.ts` |
| #9 Tempo médio de reposição | F1: (25+3+13+21+10)/5 = 14,4 dias | `backend/lead-time.spec.ts` |
| #10 Classe ABC | Aula (cortes 66/91): A={2,5}, B={8,3}, C={1,4,7,6}; F1 (80/95) | `backend/abc.spec.ts` |
| #11 Rotação | F2: 18 090 / 1267,33 = 14,274 | `backend/rotation.spec.ts` |
| #8 Autonomia | F1: 1,82; 1,32; 9,73; 5,61; 2,64 (mediana 2,644) | `backend/autonomy.spec.ts` |

### Refresh dos dados (ETL)

`npm run etl` (com a base a correr) volta a carregar os CSV de `DATA_DIR` (ou da pasta passada como argumento) numa só transação: idempotente, nunca altera os CSV.
Regista a execução em `etl_run` e o motivo de cada registo rejeitado/assinalado em `etl_quality_log`; os testes usam o mesmo `loadCsvFolder`.

### Como aplicar os filtros num novo KPI

Filtros globais: `periodo` (`2025`, `2025-Q3`, `2025-09`, `2025-01-01..2025-03-31`), `artigo` (`108:xray-machine`), `tipo` (do snapshot), `fornecedor` (`vendor_id`). O fim do período é a data de corte do snapshot de referência. Inválido = 400 `{ error, field }`.

**Backend** (`apps/backend/src/filters/`): um endpoint de leitura só precisa de

```ts
@Get('meu-kpi') async meuKpi(@Query() query: Record<string, unknown>) {
  const filters = await resolveFilters(this.pool, query);   // valida; lança 400
  const q = filteredSnapshots(filters);                      // ou filteredSnapshots(filters, 3) se já usa $1 e $2
  const { rows } = await this.pool.query(`WITH ${q.ctes} SELECT ... FROM ref WHERE x > $${q.params.length + 1}`, [...q.params, x]);
  // devolver também itemsWithoutData: (SELECT count(*) FROM no_data)
}
```

CTE disponíveis: `ref` (snapshot de referência por artigo: `ref_date`, `cutoff_date`, `stale`), `snaps` (todos os snapshots filtrados do período, para histórico/rotação/tendência), `period_snaps` (período + artigo, antes de tipo/fornecedor; é a base da classe ABC, spec 8.5), `no_data` (artigos sem snapshots no período: contar em "N artigos sem dados no período", nunca como zero) e `bounds` (`from_date`, `to_date`). `classe` e `triagem` estendem `ResolvedFilters`/`resolveFilters`/`filteredSnapshots`. Exemplo completo: `kpis/below-minimum.controller.ts`.

**Frontend** (`apps/frontend/src/filters/`): o URL é a fonte de verdade. A página lê `parseFilterState(await searchParams)` e passa o mesmo `filters` a todos os visuais; cada visual (Server Component) chama `fetchWithFilters<T>('/api/...', filters, { ...extra })` (usa `apiPath`, que acrescenta os filtros ao pedido) e mostra `itemsWithoutData`; um 400 devolve `{ ok: false, message }`. A barra de slicers (`FilterBar`) está no layout e escreve no URL com `router.replace`; novos filtros acrescentam-se a `FILTER_KEYS` e ao `FilterBarView`.

### Testes

```bash
npm test                    # backend (Jest + PostgreSQL embedded efémero + API HTTP) e frontend
npm test -w @app/frontend    # só frontend (tsx --test sobre src/**/*.test.ts(x): tema, contraste WCAG, modo, componentes de estado)
```

Os testes de API usam `createTestApp()` (`apps/backend/test/harness/test-app.ts`): cria uma base nova e isolada,
aplica as migrações, carrega opcionalmente uma pasta de CSV de teste (`fixture('f1')` em `apps/backend/test/fixtures/`)
e devolve um cliente `supertest` sobre a API real. Ver `apps/backend/test/health.spec.ts`. O `close()` é idempotente e o harness fecha, no fim de cada teste, qualquer app que tenha ficado aberta. Em Windows, `embedded-pg.ts` destrói também os pipes de stdio do processo Postgres ao parar (ficavam abertos e o Jest não terminava).
`apps/backend/test/real-data.spec.ts` confirma AC-03 e AC-40 com os CSV completos; é ignorado se os CSV não estiverem em `DATA_DIR` ou `data/`. `npm run typecheck` verifica os dois pacotes.

### Outro PostgreSQL (nativo ou Docker)

A aplicação só lê `DATABASE_URL`. Para usar outra instância, não corra `npm run db` e defina em `.env`, por exemplo:

```
DATABASE_URL=postgres://utilizador:palavra-passe@localhost:5432/stock
```

Com Docker: `docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=stock -p 5432:5432 postgres:18`
e `DATABASE_URL=postgres://postgres:postgres@localhost:5432/stock`. Os testes continuam a usar o Postgres embedded.

### Como é calculado: acrescentar uma entrada e ligar o (i) a um cartão

1. Criar `apps/backend/src/kpis/explain/entries/<id>.ts` (export default de um objeto com a forma de `ExplainEntry`: `id, title, formula, source, columns, unit, approximation, limitations`) e acrescentar **uma linha** de import e uma de lista em `explain/registry.ts`. O conteúdo fica em `GET /api/kpis/<id>/explain` (404 `{ error }` se o id não existir).
2. No frontend, trocar `<KpiCard .../>` por `<KpiCardWithInfo kpiId="<id>" label=... value=... status=... />` (`src/explain/KpiCardWithInfo.tsx`); o botão (i) abre `ExplainPanel`, que vai buscar a entrada à API.
3. Gráficos: `recharts` em componentes `'use client'` (ADR 0003); a página "Onde dói" tem a dispersão autonomia × tempo de reposição como exemplo (`src/kpis/AutonomyScatter.tsx`).

### Receita: antes vs. depois do capital imobilizado

`GET /api/impact/before-after` (filtros comuns) devolve `{ before, after, released, releasedPct, itemsAboveMax }`. Regra explícita (spec 8.4): suspendendo as encomendas dos artigos acima do máximo até o stock voltar ao máximo, liberta-se o capital em excesso K7; `before` = valor de stock total, `after = before - released`. Não prevê consumo nem preços e os € refletem custos unitários irrealistas. Reutiliza `loadExcess` de `excess-capital.controller.ts`; bloco `kpis/BeforeAfterSection.tsx`, entrada `before-after` em "Como é calculado".

### Receita: sugestão de encomenda e CSV

`GET /api/reorder-suggestions` (filtros comuns) lista os artigos com stock < ponto de encomenda, por nível de triagem decrescente e depois folga (stock - PE) crescente; artigos sem consumo não têm PE e só contam em `withoutConsumption`. Quantidade sugerida (**heurística, sem QEE**): `max_capacity - stock`; se o máximo for inconsistente (R11) ou inferior ao PE, `PE - stock` (dito no motivo). `GET /api/reorder-suggestions/export.csv` devolve a mesma lista em UTF-8 com BOM, separador `;`. A página Receita compõe-se de secções independentes (`kpis/ReorderSection.tsx` é a primeira; cada bloco novo é um `<XSection filters={filters} />` em `app/receita/page.tsx`).

### Drill-through (painel lateral)

O estado fica no URL: `?detalhe=artigo:108:xray-machine` ou `?detalhe=fornecedor:V002`, combinável com os filtros globais; recarregar reabre o painel e fechá-lo (Esc ou "Fechar") remove só `detalhe`.
Helper em `apps/frontend/src/detail/detail.ts`: `detailHref(paramsAtuais, 'artigo' | 'fornecedor', ref)` devolve o href relativo (`?...&detalhe=...`); `<DetailLink kind itemRef />` (client) usa-o com os filtros do URL atual; `closeDetailHref` fecha.
API: `GET /api/items/:itemRef` e `GET /api/vendors/:vendorId` (404 `{ error }` se não existir; aceitam `periodo`/`tipo`/`classe`); o painel (`DetailPanel`) está montado no layout.

### Layouts por perfil (Editar disposição)

**Não há autenticação.** O perfil (Diretor, Gestor de armazém, Comprador; ids `diretor`, `gestor-armazem`, `comprador`) é só uma escolha no seletor do cabeçalho, guardada no cookie `perfil` (por defeito: Diretor) para o servidor desenhar o layout certo no SSR. Qualquer cliente pode ler, escrever e apagar o layout de qualquer perfil.
API: `GET/PUT/DELETE /api/layouts/:profile` (corpo `{ layout }`; 404 sem layout, 400 `{ error, field }` se o perfil ou a forma forem inválidos, máx. 16 KiB e 30 mosaicos por página; DELETE é idempotente, 204). Tabela `dashboard_layout`, fora do esquema em estrela (o ETL não lhe toca).
Frontend (`apps/frontend/src/layout/`): cada bloco de página é um mosaico com id estável (`PAGE_TILES` em `model.ts`). Para acrescentar um bloco: acrescentar `{ id, title }` a `PAGE_TILES[página]` e uma entrada em `nodes` do `<PageTiles>` da página. Layouts guardados antigos continuam a funcionar: ids desconhecidos são ignorados e mosaicos novos vão para o fim, com o tamanho por defeito (`reconcile`). Em "Editar disposição" arrasta-se (rato) ou usam-se os botões Subir/Descer e +/− Largura/Altura (teclado, com anúncio em região `aria-live`); Guardar faz PUT, "Repor por defeito" faz DELETE. Escolha da biblioteca: `docs/adr/0004-layout-de-mosaicos.md`.
