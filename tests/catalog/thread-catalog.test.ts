import { describe, expect, test } from "vitest";

import { createCoffeeCatalog } from "../../packages/storage/src/internal/catalog/executor.js";
import {
  createThreadSpec,
  findThreadByIdSpec,
  touchThreadSpec,
} from "../../packages/storage/src/internal/catalog/entries/thread.entries.js";
import { createCatalogQueryExecutor } from "../support/catalog-query-executor.js";

describe("thread catalog", () => {
  test("maps a thread row through the create spec", async () => {
    const catalog = createCoffeeCatalog(
      createCatalogQueryExecutor([
        {
          thread_id: "thread-1",
          title: "First",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z",
          last_message_at: "2025-01-01T00:00:00.000Z",
        },
      ]),
    );

    const row = await catalog.one(createThreadSpec, ["thread-1", "First", "2025-01-01T00:00:00.000Z"]);
    expect(row.threadId).toBe("thread-1");
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  test("one() fails fast when no row is returned", async () => {
    const catalog = createCoffeeCatalog(createCatalogQueryExecutor([]));

    await expect(catalog.one(findThreadByIdSpec, ["missing"])).rejects.toThrow(
      /Expected exactly one row but received none/,
    );
  });

  test("scalar() returns the touched thread id", async () => {
    const catalog = createCoffeeCatalog(createCatalogQueryExecutor([{ thread_id: "thread-1" }]));

    await expect(
      catalog.scalar(touchThreadSpec, ["thread-1", "2025-01-01T00:00:00.000Z"]),
    ).resolves.toBe("thread-1");
  });
});
