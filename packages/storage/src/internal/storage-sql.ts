import { readFileSync } from "node:fs";

import { resolveStorageSqlFile } from "./catalog/catalog-factory.js";

const sqlCache = new Map<string, string>();

export function loadStorageSql(sqlFile: string): string {
  const cached = sqlCache.get(sqlFile);
  if (cached) {
    return cached;
  }

  const sql = readFileSync(resolveStorageSqlFile(sqlFile), "utf8");
  sqlCache.set(sqlFile, sql);
  return sql;
}
