import type {
  QueryExecutor,
  RepositoryQueryResult,
} from "../../packages/storage/src/internal/db/pg-query-executor.js";

export function createCatalogQueryExecutor(rows: Record<string, unknown>[]): QueryExecutor {
  return {
    query: async <T extends Record<string, unknown>>() =>
      ({
        rows: rows as T[],
        rowCount: rows.length,
      }) satisfies RepositoryQueryResult<T>,
  };
}
