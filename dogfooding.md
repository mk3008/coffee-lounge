# coffee-lounge Dogfooding Notes

## Scope

This note captures upstream-facing friction only.
It is intended as input for improving `rawsql-ts`, not as a general application
refactor log.

## Confirmed frictions (rawsql-ts)

### 1. Transaction boundaries should stay outside catalog scope

Status:
- still not explicitly documented in upstream `rawsql-ts`

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
