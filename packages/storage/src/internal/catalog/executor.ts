import { createPositionalCatalog, type PositionalCatalog } from "./catalog-factory.js";
import type { QueryExecutor } from "../db/pg-query-executor.js";

export type CoffeeCatalog = PositionalCatalog;

export function createCoffeeCatalog(queryExecutor: QueryExecutor): CoffeeCatalog {
  return createPositionalCatalog(queryExecutor, {
    callerName: "coffee-lounge catalog",
  });
}
