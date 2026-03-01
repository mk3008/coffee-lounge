import { z } from "zod";

export const settingRecordDtoSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  updatedAt: z.date(),
});
export type SettingRecordDto = z.infer<typeof settingRecordDtoSchema>;

export const getSettingByKeyParamsSchema = z.object({
  key: z.string().min(1),
});
export type GetSettingByKeyParams = z.infer<typeof getSettingByKeyParamsSchema>;

export const upsertSettingParamsSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  updatedAt: z.string().min(1),
});
export type UpsertSettingParams = z.infer<typeof upsertSettingParamsSchema>;

export function parseGetSettingByKeyParams(value: unknown): GetSettingByKeyParams {
  return getSettingByKeyParamsSchema.parse(value);
}

export function parseUpsertSettingParams(value: unknown): UpsertSettingParams {
  return upsertSettingParamsSchema.parse(value);
}

export function parseSettingRecordDto(value: unknown): SettingRecordDto {
  return settingRecordDtoSchema.parse(value);
}
