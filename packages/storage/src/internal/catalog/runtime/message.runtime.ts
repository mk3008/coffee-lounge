import {
  parseAddMessageParams,
  parseListMessagesByThreadParams,
  parseMessageDto,
  parseSearchMessageDto,
  parseSearchMessagesParams,
  type AddMessageParams,
  type ListMessagesByThreadParams,
  type MessageDto,
  type SearchMessageDto,
  type SearchMessagesParams,
} from "../specs/message.spec.js";
import { timestampFromDriver } from "../rawsql-contract.js";

export type MessageSqlRow = {
  message_id: unknown;
  thread_id: unknown;
  role: unknown;
  content: unknown;
  provider: unknown;
  model: unknown;
  created_at: unknown;
};

export type SearchMessageSqlRow = MessageSqlRow & {
  thread_title: unknown;
};

export function ensureAddMessageParams(value: unknown): AddMessageParams {
  return parseAddMessageParams(value);
}

export function ensureListMessagesByThreadParams(value: unknown): ListMessagesByThreadParams {
  return parseListMessagesByThreadParams(value);
}

export function ensureSearchMessagesParams(value: unknown): SearchMessagesParams {
  return parseSearchMessagesParams(value);
}

export function ensureMessageDto(value: unknown): MessageDto {
  return parseMessageDto(value);
}

export function ensureSearchMessageDto(value: unknown): SearchMessageDto {
  return parseSearchMessageDto(value);
}

export function mapMessageRowToDto(row: MessageSqlRow): MessageDto {
  return parseMessageDto({
    messageId: row.message_id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    provider: row.provider,
    model: row.model,
    createdAt: timestampFromDriver(row.created_at, "created_at"),
  });
}

export function mapSearchMessageRowToDto(row: SearchMessageSqlRow): SearchMessageDto {
  return parseSearchMessageDto({
    ...mapMessageRowToDto(row),
    threadTitle: row.thread_title,
  });
}
