# storage package (coffee-lounge)

`@coffee-lounge/storage` is the Postgres persistence boundary for the MVP.

## Responsibilities

- initialize the schema from `ztd/ddl/public.sql`
- persist threads, messages, attachments, and runtime settings
- keep handwritten SQL inside the storage package
- expose a small application-facing `ChatStorage` interface

## Repository layout

- `src/internal/catalog-repositories.ts`
  - thread, message, and settings repositories
  - backed by SQL catalog specs and rawsql-ts
- `src/internal/attachment-repository.ts`
  - attachment metadata writes
- `src/internal/snapshot-repository.ts`
  - export / import of the logical dataset

`PgChatStorage` orchestrates those repositories. It should stay as an application
service boundary, not a place where ad-hoc SQL accumulates.
