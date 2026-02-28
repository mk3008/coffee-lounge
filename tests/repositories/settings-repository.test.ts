import { describe, expect, test } from "vitest";

import {
  getSettingByKeySpec,
  listAllSettingsSpec,
  upsertSettingSpec,
} from "../../packages/storage/src/internal/catalog/entries/settings.entries.js";
import { SettingsRepository } from "../../packages/storage/src/internal/repositories/tables/settings-repository.js";
import { createFakeCatalog } from "../support/fake-catalog.js";

describe("SettingsRepository", () => {
  test("getByKey returns null when a setting is missing", async () => {
    const catalog = createFakeCatalog();
    catalog.one.mockRejectedValue(new Error("Expected exactly one row but received none."));
    const repository = new SettingsRepository(catalog);
    await expect(repository.getByKey({ key: "provider" })).resolves.toBeNull();
    expect(catalog.one).toHaveBeenCalledWith(getSettingByKeySpec, ["provider"]);
  });

  test("listAll delegates to the catalog", async () => {
    const catalog = createFakeCatalog();
    catalog.list.mockResolvedValue([]);
    const repository = new SettingsRepository(catalog);

    await repository.listAll();
    expect(catalog.list).toHaveBeenCalledWith(listAllSettingsSpec, []);
  });

  test("upsert delegates to the catalog with serialized JSON", async () => {
    const catalog = createFakeCatalog();
    catalog.one.mockResolvedValue({
      key: "provider",
      value: "openai",
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    const repository = new SettingsRepository(catalog);

    const setting = await repository.upsert({
      key: "provider",
      value: "openai",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(setting.key).toBe("provider");
    expect(catalog.one).toHaveBeenCalledWith(upsertSettingSpec, [
      "provider",
      "\"openai\"",
      "2025-01-01T00:00:00.000Z",
    ]);
  });
});
