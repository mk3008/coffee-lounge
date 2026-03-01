import { resolve } from "node:path";

import { createPgTestkitPool } from "../../../rawsql-ts/packages/adapters/adapter-node-pg/dist/index.js";

import type { QueryExecutor } from "../../packages/storage/src/internal/db/pg-query-executor.js";
import { PgQueryExecutor } from "../../packages/storage/src/internal/db/pg-query-executor.js";
import type { PublicMessagesTestRow, PublicThreadsTestRow } from "../generated/ztd-row-map.generated.js";

type TableRowsFixture<Row extends Record<string, unknown>> = {
  tableName: string;
  rows: Row[];
};

export async function runWithPgFixtures<T>(
  connectionString: string,
  fixtures: Array<TableRowsFixture<PublicThreadsTestRow | PublicMessagesTestRow>>,
  testFn: (db: QueryExecutor) => Promise<T>,
): Promise<T> {
  // Load the real DDL so fixture resolution stays aligned with the repository SQL.
  const pool = createPgTestkitPool(connectionString, ...fixtures, {
    ddl: {
      directories: [resolve(process.cwd(), "ztd/ddl")],
    },
  });

  try {
    const db = new PgQueryExecutor(pool);
    return await testFn(db);
  } finally {
    await pool.end();
  }
}
