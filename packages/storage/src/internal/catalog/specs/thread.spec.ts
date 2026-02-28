import { z } from "zod";

export const threadIdSchema = z.string().min(1);
export type ThreadId = z.infer<typeof threadIdSchema>;

export const threadDtoSchema = z.object({
  threadId: threadIdSchema,
  title: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastMessageAt: z.date(),
});
export type ThreadDto = z.infer<typeof threadDtoSchema>;

export const createThreadParamsSchema = z.object({
  threadId: threadIdSchema,
  title: z.string().min(1),
  createdAt: z.string().min(1),
});
export type CreateThreadParams = z.infer<typeof createThreadParamsSchema>;

export const findThreadByIdParamsSchema = z.object({
  threadId: threadIdSchema,
});
export type FindThreadByIdParams = z.infer<typeof findThreadByIdParamsSchema>;

export const listRecentThreadsParamsSchema = z.object({
  limit: z.number().int().positive(),
});
export type ListRecentThreadsParams = z.infer<typeof listRecentThreadsParamsSchema>;

export const touchThreadParamsSchema = z.object({
  threadId: threadIdSchema,
  timestamp: z.string().min(1),
});
export type TouchThreadParams = z.infer<typeof touchThreadParamsSchema>;

export function parseCreateThreadParams(value: unknown): CreateThreadParams {
  return createThreadParamsSchema.parse(value);
}

export function parseFindThreadByIdParams(value: unknown): FindThreadByIdParams {
  return findThreadByIdParamsSchema.parse(value);
}

export function parseListRecentThreadsParams(value: unknown): ListRecentThreadsParams {
  return listRecentThreadsParamsSchema.parse(value);
}

export function parseTouchThreadParams(value: unknown): TouchThreadParams {
  return touchThreadParamsSchema.parse(value);
}

export function parseThreadDto(value: unknown): ThreadDto {
  return threadDtoSchema.parse(value);
}

export function parseThreadId(value: unknown): ThreadId {
  return threadIdSchema.parse(value);
}
