import { describe, expect, test } from "vitest";

import { createCoffeeCatalog } from "../../packages/storage/src/internal/catalog/executor.js";
import {
  getSettingByKeySpec,
  upsertSettingSpec,
} from "../../packages/storage/src/internal/catalog/entries/settings.entries.js";
import { createCatalogQueryExecutor } from "../support/catalog-query-executor.js";

describe("settings catalog", () => {
  test("maps an upserted setting row", async () => {
    const catalog = createCoffeeCatalog(
      createCatalogQueryExecutor([
        {
          key: "provider",
          value_json: "openai",
          updated_at: "2025-01-01T00:00:00.000Z",
        },
      ]),
    );

    const row = await catalog.one(upsertSettingSpec, [
      "provider",
      "\"openai\"",
      "2025-01-01T00:00:00.000Z",
    ]);
    expect(row.value).toBe("openai");
  });

  test("one() reports missing rows for getByKey", async () => {
    const catalog = createCoffeeCatalog(createCatalogQueryExecutor([]));

    await expect(catalog.one(getSettingByKeySpec, ["provider"])).rejects.toThrow(
      /Expected exactly one row but received none/,
    );
  });
});
