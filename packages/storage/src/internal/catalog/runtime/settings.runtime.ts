import {
  parseGetSettingByKeyParams,
  parseSettingRecordDto,
  parseUpsertSettingParams,
  type GetSettingByKeyParams,
  type SettingRecordDto,
  type UpsertSettingParams,
} from "../specs/settings.spec.js";
import { timestampFromDriver } from "../rawsql-contract.js";

export type SettingSqlRow = {
  key: unknown;
  value_json: unknown;
  updated_at: unknown;
};

export function ensureGetSettingByKeyParams(value: unknown): GetSettingByKeyParams {
  return parseGetSettingByKeyParams(value);
}

export function ensureUpsertSettingParams(value: unknown): UpsertSettingParams {
  return parseUpsertSettingParams(value);
}

export function ensureSettingRecordDto(value: unknown): SettingRecordDto {
  return parseSettingRecordDto(value);
}

export function mapSettingRowToDto(row: SettingSqlRow): SettingRecordDto {
  return parseSettingRecordDto({
    key: row.key,
    value: row.value_json,
    updatedAt: timestampFromDriver(row.updated_at, "updated_at"),
  });
}
