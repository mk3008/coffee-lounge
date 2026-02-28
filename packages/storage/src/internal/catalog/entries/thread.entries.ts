import type { QuerySpec } from "../rawsql-contract.js";
import { rowMapping } from "../rawsql-contract.js";
import { mappedOutput, scalarOutput } from "../spec-helpers.js";
import {
  ensureThreadId,
  ensureThreadDto,
} from "../runtime/thread.runtime.js";
import type {
  ThreadDto,
  ThreadId,
} from "../specs/thread.spec.js";

type CreateThreadCatalogParams = [threadId: string, title: string, createdAt: string];
type FindThreadByIdCatalogParams = [threadId: string];
type ListRecentThreadsCatalogParams = [limit: number];
type TouchThreadCatalogParams = [threadId: string, timestamp: string];

const threadMapping = rowMapping<ThreadDto>({
  name: "ThreadDto",
  key: "threadId",
  columnMap: {
    threadId: "thread_id",
    title: "title",
    createdAt: "created_at",
    updatedAt: "updated_at",
    lastMessageAt: "last_message_at",
  },
});

export const createThreadSpec: QuerySpec<CreateThreadCatalogParams, ThreadDto> = {
  id: "thread.create",
  sqlFile: "thread/create_thread.sql",
  params: { shape: "positional", example: ["thread-1", "First", "2025-01-01T00:00:00.000Z"] },
  output: mappedOutput({
    mapping: threadMapping,
    validate: ensureThreadDto,
    example: {
      threadId: "thread-1",
      title: "First",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      lastMessageAt: new Date("2025-01-01T00:00:00.000Z"),
    },
  }),
};

export const findThreadByIdSpec: QuerySpec<FindThreadByIdCatalogParams, ThreadDto> = {
  id: "thread.findById",
  sqlFile: "thread/find_thread_by_thread_id.sql",
  params: { shape: "positional", example: ["thread-1"] },
  output: mappedOutput({
    mapping: threadMapping,
    validate: ensureThreadDto,
    example: createThreadSpec.output.example,
  }),
};

export const listRecentThreadsSpec: QuerySpec<ListRecentThreadsCatalogParams, ThreadDto> = {
  id: "thread.listRecent",
  sqlFile: "thread/list_recent_threads.sql",
  params: { shape: "positional", example: [20] },
  output: mappedOutput({
    mapping: threadMapping,
    validate: ensureThreadDto,
    example: createThreadSpec.output.example,
  }),
};

export const touchThreadSpec: QuerySpec<TouchThreadCatalogParams, ThreadId> = {
  id: "thread.touch",
  sqlFile: "thread/touch_thread.sql",
  params: { shape: "positional", example: ["thread-1", "2025-01-01T00:00:00.000Z"] },
  output: scalarOutput({
    validate: (value: unknown) => ensureThreadId(value),
    example: "thread-1",
  }),
};
