import {
  parseCreateThreadParams,
  parseFindThreadByIdParams,
  parseListRecentThreadsParams,
  parseThreadDto,
  parseThreadId,
  parseTouchThreadParams,
  type CreateThreadParams,
  type FindThreadByIdParams,
  type ListRecentThreadsParams,
  type ThreadDto,
  type ThreadId,
  type TouchThreadParams,
} from "../specs/thread.spec.js";
import { timestampFromDriver } from "../rawsql-contract.js";

export type ThreadSqlRow = {
  thread_id: unknown;
  title: unknown;
  created_at: unknown;
  updated_at: unknown;
  last_message_at: unknown;
};

export function ensureCreateThreadParams(value: unknown): CreateThreadParams {
  return parseCreateThreadParams(value);
}

export function ensureFindThreadByIdParams(value: unknown): FindThreadByIdParams {
  return parseFindThreadByIdParams(value);
}

export function ensureListRecentThreadsParams(value: unknown): ListRecentThreadsParams {
  return parseListRecentThreadsParams(value);
}

export function ensureTouchThreadParams(value: unknown): TouchThreadParams {
  return parseTouchThreadParams(value);
}

export function ensureThreadId(value: unknown): ThreadId {
  return parseThreadId(value);
}

export function ensureThreadDto(value: unknown): ThreadDto {
  return parseThreadDto(value);
}

export function mapThreadRowToDto(row: ThreadSqlRow): ThreadDto {
  return parseThreadDto({
    threadId: row.thread_id,
    title: row.title,
    createdAt: timestampFromDriver(row.created_at, "created_at"),
    updatedAt: timestampFromDriver(row.updated_at, "updated_at"),
    lastMessageAt: timestampFromDriver(row.last_message_at, "last_message_at"),
  });
}
