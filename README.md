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

### クイックスタート

#### 1. 依存関係を入れる

```bash
npm install
```

#### 2. Docker で Postgres を起動する

デフォルトでは `compose.postgres.yml` の設定をそのまま使います。
`coffee` CLI は `DATABASE_URL` が未設定でも、次の接続先を既定値として使います。

```text
postgres://app_user:app_password@127.0.0.1:5432/app_db
```

```bash
docker compose -f compose.postgres.yml up -d
```

別の Postgres を使いたい場合だけ、`DATABASE_URL` を上書きしてください。

```bash
export DATABASE_URL=postgres://user:password@127.0.0.1:5432/another_db
```

#### 3. Codex にログインする

このプロジェクトは API key ではなく、Codex CLI のブラウザ認証を使います。

```bash
codex login
```

#### 4. chat を始める

```bash
npm run coffee -- chat
```

最初に使うことが多いコマンド:

```bash
npm run coffee -- threads
npm run coffee -- history
npm run coffee -- search "keyword"
npm run coffee -- config
```

### 起動前提

- DB はデフォルトで Docker Compose の Postgres を使う
- スキーマ DDL は `ztd/ddl/public.sql`
- Persona ファイルは `packages/chat/personas/default.md`
- 一時ファイルは `tmp/`

### トラブルシュート

#### `codex` コマンドが見つからない

Codex CLI が PATH に入っているか確認してください。

```bash
codex --help
```

Windows では npm グローバル導入の `codex.cmd` を使います。
`where codex` または `where codex.cmd` で見つからない場合は、Codex CLI の導入先を PATH に追加してください。

#### 認証していないと言われる

先にブラウザ認証を完了してください。

```bash
codex login
```

provider 実行失敗時は、`codex login` を完了するようエラーメッセージが出ます。

#### Docker を起動したのに DB 接続できない

まずコンテナが起動しているか確認してください。

```bash
docker compose -f compose.postgres.yml ps
```

既定の接続先は次です。

```text
postgres://app_user:app_password@127.0.0.1:5432/app_db
```

ポート競合やローカル設定の上書きがある場合は、`DATABASE_URL` を明示してください。

#### テストの ZTD ケースが skip される

`TEST_PG_URI` が未設定だと ZTD テストは skip されます。

```bash
export TEST_PG_URI=postgres://app_user:app_password@127.0.0.1:5432/app_db
npm test
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
