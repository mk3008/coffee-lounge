# rawsql-ts Dogfooding Notes

## Scope

This note captures friction discovered while wiring `coffee-lounge` to local `rawsql-ts` repositories instead of npm packages.

## Confirmed friction

### 1. Monorepo path ergonomics are still manual

What happened:
- `sql-contract` catalog wiring required explicit custom loaders pointing at `packages/storage/src/sql`.
- After moving runtime code out of the root `src`, every loader and test import path had to be updated manually.

Why this matters:
- The current API is flexible, but monorepo package layouts need repetitive `resolve(process.cwd(), "...")` code.
- This creates unnecessary churn when code is reorganized between packages.

Possible improvement:
- Add a small helper in `sql-contract` docs or runtime utilities for file-backed catalog loaders.
- Example shape: `createFileCatalogLoader({ baseDir })`.

### 2. Catalog validation order is easy to misunderstand

What happened:
- Initial tests failed because `output.validate` was written against raw snake_case rows.
- In practice, validation runs after `output.mapping`, so validators must accept mapped DTOs.

Why this matters:
- This is a correct design, but it is easy to misuse when introducing `rowMapping` for the first time.
- The failure mode shows up only at runtime unless tests are written early.

Possible improvement:
- Strengthen documentation around the execution order.
- Add one focused example showing:
  - raw SQL row
  - mapping result
  - DTO validator running after mapping

### 3. Scalar contracts are less expressive than row-mapped contracts

What happened:
- For `UPDATE ... RETURNING thread_id`, using a mapped object contract was awkward when the final desired value was a scalar string.
- The simplest solution was to skip mapping and validate the scalar directly.

Why this matters:
- Scalar queries are common for `count(*)`, `returning id`, and similar workflows.
- The current path works, but the ergonomics are uneven compared with row contracts.

Possible improvement:
- Document the recommended scalar patterns more explicitly.
- If needed, consider a tiny helper for extracting one named column before validation.

### 4. Dogfooding with local packages needs clearer guidance

What happened:
- Using the local repository code worked after switching to a `file:` dependency and `npm install --ignore-scripts`.
- Without that, workspace build hooks and import resolution were easy to trip over.

Why this matters:
- Dogfooding local package code is a likely workflow for `rawsql-ts` itself.
- Clear guidance reduces false negatives caused by workspace wiring rather than library behavior.

Possible improvement:
- Add a short recipe for local package consumption from another repo.
- Include notes for npm workspaces and postinstall/build interactions.

## Current status

- No rawsql-ts source changes were made yet.
- No PR has been opened yet.
- These notes are based on actual integration work in `coffee-lounge`, not hypothetical concerns.

## coffee-lounge-side mitigations applied

- Added `createPositionalCatalog(...)` so file-loader wiring and positional-param checks are declared once.
- Added `mappedOutput(...)` to make the `mapping -> validate` order obvious in every `QuerySpec`.
- Added `scalarOutput(...)` and used it for `RETURNING thread_id`, which reads more naturally than a one-field DTO.
- Documented the patterns in `README.md` so future integrations have a concrete reference implementation.
