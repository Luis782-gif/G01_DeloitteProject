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

### Refresh dos dados (ETL)

`npm run etl` (com a base a correr) volta a carregar os CSV de `DATA_DIR` (ou da pasta passada como argumento) numa só transação: idempotente, nunca altera os CSV.
Regista a execução em `etl_run` e o motivo de cada registo rejeitado/assinalado em `etl_quality_log`; os testes usam o mesmo `loadCsvFolder`.

### Testes

```bash
npm test                    # backend (Jest + PostgreSQL embedded efémero + API HTTP) e frontend
npm test -w @app/frontend    # só frontend (tsx --test sobre src/**/*.test.ts(x): tema, contraste WCAG, modo, componentes de estado)
```

Os testes de API usam `createTestApp()` (`apps/backend/test/harness/test-app.ts`): cria uma base nova e isolada,
aplica as migrações, carrega opcionalmente uma pasta de CSV de teste (`fixture('f1')` em `apps/backend/test/fixtures/`)
e devolve um cliente `supertest` sobre a API real. Ver `apps/backend/test/health.spec.ts`.

### Outro PostgreSQL (nativo ou Docker)

A aplicação só lê `DATABASE_URL`. Para usar outra instância, não corra `npm run db` e defina em `.env`, por exemplo:

```
DATABASE_URL=postgres://utilizador:palavra-passe@localhost:5432/stock
```

Com Docker: `docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=stock -p 5432:5432 postgres:18`
e `DATABASE_URL=postgres://postgres:postgres@localhost:5432/stock`. Os testes continuam a usar o Postgres embedded.
