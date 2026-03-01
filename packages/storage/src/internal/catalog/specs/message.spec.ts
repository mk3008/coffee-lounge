import { z } from "zod";

export const messageRoleSchema = z.enum(["system", "user", "assistant"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageDtoSchema = z.object({
  messageId: z.string().min(1),
  threadId: z.string().min(1),
  role: messageRoleSchema,
  content: z.string(),
  provider: z.string().min(1),
  model: z.string().min(1),
  createdAt: z.date(),
});
export type MessageDto = z.infer<typeof messageDtoSchema>;

export const searchMessageDtoSchema = messageDtoSchema.extend({
  threadTitle: z.string().min(1),
});
export type SearchMessageDto = z.infer<typeof searchMessageDtoSchema>;

export const addMessageParamsSchema = z.object({
  messageId: z.string().min(1),
  threadId: z.string().min(1),
  role: messageRoleSchema,
  content: z.string(),
  provider: z.string().min(1),
  model: z.string().min(1),
  createdAt: z.string().min(1),
});
export type AddMessageParams = z.infer<typeof addMessageParamsSchema>;

export const listMessagesByThreadParamsSchema = z.object({
  threadId: z.string().min(1),
  limit: z.number().int().positive(),
});
export type ListMessagesByThreadParams = z.infer<typeof listMessagesByThreadParamsSchema>;

export const searchMessagesParamsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive(),
});
export type SearchMessagesParams = z.infer<typeof searchMessagesParamsSchema>;

export function parseAddMessageParams(value: unknown): AddMessageParams {
  return addMessageParamsSchema.parse(value);
}

export function parseListMessagesByThreadParams(value: unknown): ListMessagesByThreadParams {
  return listMessagesByThreadParamsSchema.parse(value);
}

export function parseSearchMessagesParams(value: unknown): SearchMessagesParams {
  return searchMessagesParamsSchema.parse(value);
}

export function parseMessageDto(value: unknown): MessageDto {
  return messageDtoSchema.parse(value);
}

export function parseSearchMessageDto(value: unknown): SearchMessageDto {
  return searchMessageDtoSchema.parse(value);
}
