# PostgreSQL embedded via npm e acesso a dados em SQL com `pg`

A equipa não tem Postgres nem Docker instalados, e os KPI da spec são pesados em SQL (agregações, janelas, medianas). Decidimos (1) arrancar o PostgreSQL por um pacote npm (`embedded-postgres`, validado em Windows), efémero nos testes e persistente em `apps/backend/.pgdata` no desenvolvimento; (2) aceder aos dados com `pg` e migrações em SQL (`apps/backend/migrations/`), sem ORM. A aplicação só consome `DATABASE_URL`, por isso pode apontar para Postgres nativo ou Docker sem alterar código.

## Considered Options

- **Docker ou Postgres nativo obrigatório**: não existem nesta máquina; barreira de entrada para a equipa.
- **ORM (Prisma, TypeORM)**: lock-in e consultas de KPI acabariam em SQL cru de qualquer forma.
- **SQLite ou pg-mem nos testes**: dialeto diferente do de produção; os KPI dependem de funcionalidades do PostgreSQL.

## Consequences

- Os testes de API correm sobre PostgreSQL real, com uma base isolada por teste (ver `apps/backend/test/harness/`).
- O pacote `embedded-postgres` está em versão beta (binários PostgreSQL 18): fixar a versão e reavaliar se falhar noutro sistema.
- Sem ORM, o esquema e os tipos TypeScript das linhas mantêm-se à mão.
