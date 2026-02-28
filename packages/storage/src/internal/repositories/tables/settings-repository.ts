import { createCoffeeCatalog, type CoffeeCatalog } from "../../catalog/executor.js";
import {
  getSettingByKeySpec,
  listAllSettingsSpec,
  upsertSettingSpec,
} from "../../catalog/entries/settings.entries.js";
import {
  ensureGetSettingByKeyParams,
  ensureUpsertSettingParams,
} from "../../catalog/runtime/settings.runtime.js";
import type { QueryExecutor } from "../../db/pg-query-executor.js";

export interface SettingRecordDto {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export class SettingsRepository {
  private readonly catalog: CoffeeCatalog;

  public constructor(catalogOrExecutor: CoffeeCatalog | QueryExecutor) {
    this.catalog =
      "one" in catalogOrExecutor && "list" in catalogOrExecutor
        ? catalogOrExecutor
        : createCoffeeCatalog(catalogOrExecutor);
  }

  public async getByKey(input: unknown): Promise<SettingRecordDto | null> {
    const params = ensureGetSettingByKeyParams(input);
    try {
      return await this.catalog.one(getSettingByKeySpec, [params.key]);
    } catch (error) {
      if (isNoRowError(error)) {
        return null;
      }
      throw error;
    }
  }

  public async listAll(): Promise<SettingRecordDto[]> {
    return this.catalog.list(listAllSettingsSpec, []);
  }

  public async upsert(input: unknown): Promise<SettingRecordDto> {
    const params = ensureUpsertSettingParams(input);
    return this.catalog.one(upsertSettingSpec, [
      params.key,
      JSON.stringify(params.value),
      params.updatedAt,
    ]);
  }
}

function isNoRowError(error: unknown): boolean {
  return error instanceof Error && /Expected exactly one row but received none/.test(error.message);
}
