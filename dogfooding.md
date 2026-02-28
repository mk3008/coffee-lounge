# coffee-lounge Dogfooding Notes

## Scope

This note captures upstream-facing friction only.
It is intended as input for improving `rawsql-ts`, not as a general application
refactor log.

## Confirmed frictions (rawsql-ts)

### 1. Catalog wiring is repetitive in monorepo package layouts

Friction summary:
- file-backed SQL catalogs require repeated loader wiring and repeated path
  decisions when SQL lives inside a package such as `packages/storage/src/sql`

Evidence:
- the integration needed explicit file-loader setup for each repository entry
  point before the code became readable
- the friction surfaced while moving storage code from the repo root into the
  package-local monorepo layout

Impact:
- first-time users can get the feature working, but the initial code reads as
  wiring noise instead of query intent
- reorganizing package paths causes avoidable churn unless the project invents a
  local helper

Proposed upstream change:
- Docs / Recipe: provide a recommended file-backed loader pattern for monorepos
  and package-local SQL directories
- Tests: add one example or regression test that uses a stable file-backed loader
  rooted in a package directory
- Optional helper: a tiny helper is acceptable later, but docs/recipe/test should
  be the first step

### 2. `mapping -> validate` execution order is easy to misread

Friction summary:
- it is not obvious on first read that `output.validate` receives the mapped DTO
  after `output.mapping`, not the raw SQL row

Evidence:
- the first integration pass wrote validators against raw snake_case rows
- the mismatch only became clear after repository tests failed and the runtime
  flow was inspected

Impact:
- this creates an easy first-time mistake around DTO validation
- the failure mode is subtle enough that many users will only catch it after
  writing tests or running real queries

Proposed upstream change:
- Docs / README: explicitly describe `raw row -> mapping -> validate`
- Recipe: include a concrete mapped DTO example beside the execution-order
  explanation
- Tests: keep a focused test that locks in validation of the mapped DTO

### 3. Scalar query guidance is under-specified

Friction summary:
- `count(*)` and `RETURNING thread_id` style queries work, but the most natural
  style for scalar contracts is not obvious from first use

Evidence:
- the first drafts modeled those queries as one-field DTOs before switching to a
  scalar contract
- once the scalar path was used directly, the intent became clearer immediately

Impact:
- users can arrive at a working solution, but often by taking an awkward detour
  through unnecessary DTO shapes
- this makes the API feel less coherent than it actually is

Proposed upstream change:
- Docs / Recipe: document the preferred scalar pattern directly
- Tests: keep one example around `count(*)` or `RETURNING id`
- Helper: optional only if docs still prove insufficient after more adoption

### 4. Transaction boundaries should stay outside catalog scope

Friction summary:
- transaction control can look like part of the SQL asset story if downstream
  code starts expressing BEGIN/COMMIT/ROLLBACK next to catalog-managed SQL

Evidence:
- during storage cleanup it was possible to drift into treating transaction
  commands like SQL assets instead of execution control

Impact:
- this blurs the boundary between query assets and execution policy
- first-time users may overgeneralize catalog scope and expect it to manage
  transaction orchestration

Proposed upstream change:
- Docs: state clearly that transaction boundaries are outside catalog scope and
  remain the caller's execution concern

## Downstream mitigations (coffee-lounge)

- local helpers (`createPositionalCatalog`, `mappedOutput`, `scalarOutput`) were
  added so the app could stay readable without forcing an upstream API
- transaction control stayed in application code through `withTransaction(...)`
  rather than being treated as an upstream catalog concern

## Non-goals

- app-specific cleanup is not upstream dogfooding feedback
- repository splitting, storage orchestration, and transaction helper placement
  inside `coffee-lounge` are downstream concerns unless they expose a rawsql-ts
  usability problem

## Rule of thumb

- promote a note upstream only when the friction comes from using rawsql-ts
- every upstream note should include evidence, a minimal reproduction, and a
  concrete `Proposed upstream change`
