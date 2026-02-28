import type { QuerySpec } from "../rawsql-contract.js";
import { rowMapping } from "../rawsql-contract.js";
import { mappedOutput } from "../spec-helpers.js";
import {
  ensureSettingRecordDto,
} from "../runtime/settings.runtime.js";
import type {
  SettingRecordDto,
} from "../specs/settings.spec.js";

type GetSettingByKeyCatalogParams = [key: string];
type UpsertSettingCatalogParams = [key: string, valueJson: string, updatedAt: string];

const settingMapping = rowMapping<SettingRecordDto>({
  name: "SettingRecordDto",
  key: "key",
  columnMap: {
    key: "key",
    value: "value_json",
    updatedAt: "updated_at",
  },
});

const settingExample: SettingRecordDto = {
  key: "provider",
  value: "openai",
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
};

export const getSettingByKeySpec: QuerySpec<GetSettingByKeyCatalogParams, SettingRecordDto> = {
  id: "settings.getByKey",
  sqlFile: "settings/get_setting_by_key.sql",
  params: { shape: "positional", example: ["provider"] },
  output: mappedOutput({
    mapping: settingMapping,
    validate: ensureSettingRecordDto,
    example: settingExample,
  }),
};

export const listAllSettingsSpec: QuerySpec<[], SettingRecordDto> = {
  id: "settings.listAll",
  sqlFile: "settings/list_all_settings.sql",
  params: { shape: "positional", example: [] },
  output: mappedOutput({
    mapping: settingMapping,
    validate: ensureSettingRecordDto,
    example: settingExample,
  }),
};

export const upsertSettingSpec: QuerySpec<UpsertSettingCatalogParams, SettingRecordDto> = {
  id: "settings.upsert",
  sqlFile: "settings/upsert_setting.sql",
  params: {
    shape: "positional",
    example: ["provider", "\"openai\"", "2025-01-01T00:00:00.000Z"],
  },
  output: mappedOutput({
    mapping: settingMapping,
    validate: ensureSettingRecordDto,
    example: settingExample,
  }),
};
