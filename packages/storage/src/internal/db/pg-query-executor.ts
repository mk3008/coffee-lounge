import type { Pool, PoolClient, QueryResultRow } from "pg";

interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{
    rows: Row[];
    rowCount: number | null;
  }>;
}

export interface RepositoryQueryResult<T> {
  rows: T[];
  rowCount?: number | null;
}

export interface QueryExecutor {
  query<T extends Record<string, unknown>>(
    queryText: string,
    values?: readonly unknown[],
  ): Promise<RepositoryQueryResult<T>>;
}

export class PgQueryExecutor implements QueryExecutor {
  private readonly db: Queryable;

  public constructor(db: Pool | PoolClient) {
    this.db = db;
  }

  public async query<T extends Record<string, unknown>>(
    queryText: string,
    values: readonly unknown[] = [],
  ): Promise<RepositoryQueryResult<T>> {
    const result = await this.db.query<T>(queryText, [...values]);

    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  }
}
