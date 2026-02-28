import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createCatalogExecutor, type CatalogExecutor } from "./rawsql-contract.js";
import type { QueryExecutor } from "../db/pg-query-executor.js";

const STORAGE_SQL_DIRECTORY = ["packages", "storage", "src", "sql"] as const;

export type PositionalCatalog = Pick<CatalogExecutor, "one" | "list" | "scalar">;

export function resolveStorageSqlFile(sqlFile: string): string {
  return resolve(process.cwd(), ...STORAGE_SQL_DIRECTORY, sqlFile);
}

export function createStorageSqlLoader() {
  return {
    load: async (sqlFile: string) => readFile(resolveStorageSqlFile(sqlFile), "utf8"),
  };
}

export function createPositionalCatalog(
  queryExecutor: QueryExecutor,
  options: {
    callerName: string;
  },
): PositionalCatalog {
  return createCatalogExecutor({
    loader: createStorageSqlLoader(),
    executor: async (sql: string, params: readonly unknown[] | Record<string, unknown>) => {
      if (!Array.isArray(params)) {
        throw new Error(`${options.callerName} requires positional parameters`);
      }

      return (await queryExecutor.query(sql, params)).rows;
    },
  });
}
