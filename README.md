# coffee-lounge

coffee-lounge は、AI と一人で壁打ちするための「思考を整理する場所」です。

喫茶店で物思いにふけるように、  
バーで愚痴を聞いてもらうように、  
未整理の思考をそのまま投げられる空間を提供します。

## これは何か

- チャットを唯一のインターフェイスとする
- 会話を継続し、長期記憶を持つ
- トークン消費を意識しながら、思考整理を支援する

Phase 1 (MVP) では、**賢さよりも「成立すること」**を重視します。

## これは何ではない（Non-goals）

Phase 1 では、以下は意図的に行いません。

- 記憶の分類や自動整理
- 知識マップの構築
- マルチユーザ対応
- センシティブ情報の保護
- UI の作り込み
- 要件定義や Issue 自動生成

## ライセンス

MIT License

---

This repository is currently developed as a solo project.
Contributions are not accepted at this stage.

## CLI MVP

### Install

```bash
npm install
```

### Local rawsql-ts / ZTD usage

This project does not rely on the npm-published `rawsql-ts` packages.
Instead it uses the local repository checkout at:

```text
../rawsql-ts
```

ZTD commands are forwarded to the locally built CLI:

```bash
npm run ztd:config
npm run ztd:ddl:diff
npm run ztd:ddl:pull
```

### SQL catalog patterns used here

`coffee-lounge` keeps the SQL catalog inside `packages/storage` and uses two small project-local conventions:

- `createPositionalCatalog(...)` centralizes the file-backed loader and the positional-parameter guard.
- `mappedOutput(...)` makes it explicit that `validate` runs after `rowMapping`.
- `scalarOutput(...)` is used for `count(*)` / `RETURNING id` style queries, where a scalar contract is clearer than inventing a one-field DTO.

These helpers live in:

```text
packages/storage/src/internal/catalog/catalog-factory.ts
packages/storage/src/internal/catalog/spec-helpers.ts
```

This is intentionally application-side glue for dogfooding. It documents the patterns that felt natural before proposing any upstream rawsql-ts API changes.

### Postgres runtime

Set `DATABASE_URL` before running the CLI.

```bash
docker compose -f compose.postgres.yml up -d
export DATABASE_URL=postgres://app_user:app_password@127.0.0.1:5432/app_db
```

Schema DDL is stored in:

```text
ztd/ddl/public.sql
```

For pg-testkit-backed tests, use the same container and point `TEST_PG_URI` at it:

```bash
export TEST_PG_URI=postgres://app_user:app_password@127.0.0.1:5432/app_db
npm test
```

### OpenAI browser auth

This project uses the Codex CLI browser login flow instead of API keys.

```bash
codex login
```

If login succeeds, the chat provider uses the authenticated Codex CLI session for responses.

### Run

```bash
npm run coffee -- chat
npm run coffee -- threads
npm run coffee -- history
npm run coffee -- search "keyword"
npm run coffee -- export ./backup
npm run coffee -- import ./backup
```

### Persistence

- Postgres database: defined by `DATABASE_URL`
- Persona file: `packages/chat/personas/default.md`
- DDL source: `ztd/ddl/public.sql`
- Temp files: `tmp/`
