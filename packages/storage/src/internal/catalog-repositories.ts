import {
  rowMapping,
  type CatalogExecutor,
  type QuerySpec,
} from "@rawsql-ts/sql-contract";

import type { Pool, PoolClient } from "pg";

import { createPositionalCatalog } from "./catalog/catalog-factory.js";
import type { MessageRecord, RuntimeSettings, SearchResult, ThreadRecord } from "../types.js";

interface Queryable {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{
    rows: Row[];
    rowCount: number | null;
  }>;
}

export interface QueryExecutor {
  query<T extends Record<string, unknown>>(
    queryText: string,
    values?: readonly unknown[],
  ): Promise<{
    rows: T[];
    rowCount?: number | null;
  }>;
}

export class PgQueryExecutor implements QueryExecutor {
  private readonly db: Queryable;

  public constructor(db: Pool | PoolClient) {
    this.db = db;
  }

  public async query<T extends Record<string, unknown>>(
    queryText: string,
    values: readonly unknown[] = [],
  ): Promise<{
    rows: T[];
    rowCount?: number | null;
  }> {
    const result = await this.db.query<T>(queryText, [...values]);
    return { rows: result.rows, rowCount: result.rowCount };
  }
}

type StorageCatalog = Pick<CatalogExecutor, "one" | "list" | "scalar">;

function normalizeIsoTimestamp(value: unknown, fieldName: string): string {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp for ${fieldName}`);
  }

  return date.toISOString();
}

function ensureThreadRecord(value: unknown): ThreadRecord {
  const row = value as Record<string, unknown>;

  return {
    id: String(row.id),
    title: String(row.title),
    createdAt: normalizeIsoTimestamp(row.createdAt, "createdAt"),
    updatedAt: normalizeIsoTimestamp(row.updatedAt, "updatedAt"),
    lastMessageAt: normalizeIsoTimestamp(row.lastMessageAt, "lastMessageAt"),
  };
}

function ensureMessageRecord(value: unknown): MessageRecord {
  const row = value as Record<string, unknown>;

  return {
    id: String(row.id),
    threadId: String(row.threadId),
    role: String(row.role) as MessageRecord["role"],
    content: String(row.content),
    provider: String(row.provider),
    model: String(row.model),
    createdAt: normalizeIsoTimestamp(row.createdAt, "createdAt"),
  };
}

function ensureSearchResult(value: unknown): SearchResult {
  const row = value as Record<string, unknown>;

  return {
    threadId: String(row.threadId),
    threadTitle: String(row.threadTitle),
    messageId: String(row.messageId),
    role: String(row.role) as SearchResult["role"],
    content: String(row.content),
    createdAt: normalizeIsoTimestamp(row.createdAt, "createdAt"),
  };
}

type SettingRow = {
  key: string;
  value: unknown;
  updatedAt: string;
};

function ensureSettingRow(value: unknown): SettingRow {
  const row = value as Record<string, unknown>;

  return {
    key: String(row.key),
    value: row.value,
    updatedAt: normalizeIsoTimestamp(row.updatedAt, "updatedAt"),
  };
}

const threadMapping = rowMapping<ThreadRecord>({
  name: "StorageThreadRecord",
  key: "id",
  columnMap: {
    id: "thread_id",
    title: "title",
    createdAt: "created_at",
    updatedAt: "updated_at",
    lastMessageAt: "last_message_at",
  },
});

const messageMapping = rowMapping<MessageRecord>({
  name: "StorageMessageRecord",
  key: "id",
  columnMap: {
    id: "message_id",
    threadId: "thread_id",
    role: "role",
    content: "content",
    provider: "provider",
    model: "model",
    createdAt: "created_at",
  },
});

const searchMapping = rowMapping<SearchResult>({
  name: "StorageSearchResult",
  key: "messageId",
  columnMap: {
    threadId: "thread_id",
    threadTitle: "thread_title",
    messageId: "message_id",
    role: "role",
    content: "content",
    createdAt: "created_at",
  },
});

const settingMapping = rowMapping<SettingRow>({
  name: "StorageSettingRow",
  key: "key",
  columnMap: {
    key: "key",
    value: "value_json",
    updatedAt: "updated_at",
  },
});

const createThreadSpec: QuerySpec<[string, string, string], ThreadRecord> = {
  id: "storage.thread.create",
  sqlFile: "thread/create_thread.sql",
  params: { shape: "positional", example: ["thread-1", "First", "2025-01-01T00:00:00.000Z"] },
  output: {
    mapping: threadMapping,
    validate: ensureThreadRecord,
    example: {
      id: "thread-1",
      title: "First",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      lastMessageAt: "2025-01-01T00:00:00.000Z",
    },
  },
};

const findThreadByIdSpec: QuerySpec<[string], ThreadRecord> = {
  id: "storage.thread.findById",
  sqlFile: "thread/find_thread_by_thread_id.sql",
  params: { shape: "positional", example: ["thread-1"] },
  output: {
    mapping: threadMapping,
    validate: ensureThreadRecord,
    example: createThreadSpec.output.example,
  },
};

const listRecentThreadsSpec: QuerySpec<[number], ThreadRecord> = {
  id: "storage.thread.listRecent",
  sqlFile: "thread/list_recent_threads.sql",
  params: { shape: "positional", example: [20] },
  output: {
    mapping: threadMapping,
    validate: ensureThreadRecord,
    example: createThreadSpec.output.example,
  },
};

const touchThreadSpec: QuerySpec<[string, string], string> = {
  id: "storage.thread.touch",
  sqlFile: "thread/touch_thread.sql",
  params: { shape: "positional", example: ["thread-1", "2025-01-01T00:00:00.000Z"] },
  output: {
    validate: (value: unknown) => String(value),
    example: "thread-1",
  },
};

const addMessageSpec: QuerySpec<
  [string, string, "system" | "user" | "assistant", string, string, string, string],
  MessageRecord
> = {
  id: "storage.message.add",
  sqlFile: "message/add_message.sql",
  params: {
    shape: "positional",
    example: ["message-1", "thread-1", "user", "hello", "openai", "gpt-5-codex", "2025-01-01T00:00:00.000Z"],
  },
  output: {
    mapping: messageMapping,
    validate: ensureMessageRecord,
    example: {
      id: "message-1",
      threadId: "thread-1",
      role: "user",
      content: "hello",
      provider: "openai",
      model: "gpt-5-codex",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  },
};

const listMessagesByThreadSpec: QuerySpec<[string, number], MessageRecord> = {
  id: "storage.message.listByThread",
  sqlFile: "message/list_messages_by_thread_id.sql",
  params: { shape: "positional", example: ["thread-1", 20] },
  output: {
    mapping: messageMapping,
    validate: ensureMessageRecord,
    example: addMessageSpec.output.example,
  },
};

const searchMessagesSpec: QuerySpec<[string, number], SearchResult> = {
  id: "storage.message.search",
  sqlFile: "message/search_messages.sql",
  params: { shape: "positional", example: ["%hello%", 20] },
  output: {
    mapping: searchMapping,
    validate: ensureSearchResult,
    example: {
      threadId: "thread-1",
      threadTitle: "First",
      messageId: "message-1",
      role: "assistant",
      content: "reply",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  },
};

const getSettingByKeySpec: QuerySpec<[string], SettingRow> = {
  id: "storage.settings.getByKey",
  sqlFile: "settings/get_setting_by_key.sql",
  params: { shape: "positional", example: ["provider"] },
  output: {
    mapping: settingMapping,
    validate: ensureSettingRow,
    example: {
      key: "provider",
      value: "openai",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  },
};

const listAllSettingsSpec: QuerySpec<[], SettingRow> = {
  id: "storage.settings.listAll",
  sqlFile: "settings/list_all_settings.sql",
  params: { shape: "positional", example: [] },
  output: {
    mapping: settingMapping,
    validate: ensureSettingRow,
    example: getSettingByKeySpec.output.example,
  },
};

const upsertSettingSpec: QuerySpec<[string, string, string], SettingRow> = {
  id: "storage.settings.upsert",
  sqlFile: "settings/upsert_setting.sql",
  params: { shape: "positional", example: ["provider", "\"openai\"", "2025-01-01T00:00:00.000Z"] },
  output: {
    mapping: settingMapping,
    validate: ensureSettingRow,
    example: getSettingByKeySpec.output.example,
  },
};

export function createStorageCatalog(queryExecutor: QueryExecutor): StorageCatalog {
  return createPositionalCatalog(queryExecutor, {
    callerName: "storage catalog",
  });
}

function isNoRowError(error: unknown): boolean {
  return error instanceof Error && /Expected exactly one row but received none/.test(error.message);
}

export class ThreadRepository {
  private readonly catalog: StorageCatalog;

  public constructor(queryExecutor: QueryExecutor) {
    this.catalog = createStorageCatalog(queryExecutor);
  }

  public create(threadId: string, title: string, createdAt: string): Promise<ThreadRecord> {
    return this.catalog.one(createThreadSpec, [threadId, title, createdAt]);
  }

  public async findById(threadId: string): Promise<ThreadRecord | null> {
    try {
      return await this.catalog.one(findThreadByIdSpec, [threadId]);
    } catch (error) {
      if (isNoRowError(error)) {
        return null;
      }

      throw error;
    }
  }

  public listRecent(limit: number): Promise<ThreadRecord[]> {
    return this.catalog.list(listRecentThreadsSpec, [limit]);
  }

  public async touch(threadId: string, timestamp: string): Promise<void> {
    try {
      await this.catalog.scalar(touchThreadSpec, [threadId, timestamp]);
    } catch (error) {
      if (isNoRowError(error)) {
        throw new Error(`thread not found: ${threadId}`);
      }

      throw error;
    }
  }
}

export class MessageRepository {
  private readonly catalog: StorageCatalog;

  public constructor(queryExecutor: QueryExecutor) {
    this.catalog = createStorageCatalog(queryExecutor);
  }

  public add(input: {
    messageId: string;
    threadId: string;
    role: "system" | "user" | "assistant";
    content: string;
    provider: string;
    model: string;
    createdAt: string;
  }): Promise<MessageRecord> {
    return this.catalog.one(addMessageSpec, [
      input.messageId,
      input.threadId,
      input.role,
      input.content,
      input.provider,
      input.model,
      input.createdAt,
    ]);
  }

  public async listByThread(threadId: string, limit: number): Promise<MessageRecord[]> {
    const rows = await this.catalog.list(listMessagesByThreadSpec, [threadId, limit]);

    // The SQL returns descending order to make LIMIT efficient; the chat runtime
    // needs ascending history for provider input.
    return [...rows].reverse();
  }

  public search(query: string, limit: number): Promise<SearchResult[]> {
    return this.catalog.list(searchMessagesSpec, [`%${query}%`, limit]);
  }
}

export class SettingsRepository {
  private readonly catalog: StorageCatalog;

  public constructor(queryExecutor: QueryExecutor) {
    this.catalog = createStorageCatalog(queryExecutor);
  }

  public async getByKey(key: string): Promise<SettingRow | null> {
    try {
      return await this.catalog.one(getSettingByKeySpec, [key]);
    } catch (error) {
      if (isNoRowError(error)) {
        return null;
      }

      throw error;
    }
  }

  public listAll(): Promise<SettingRow[]> {
    return this.catalog.list(listAllSettingsSpec, []);
  }

  public upsert(key: string, value: unknown, updatedAt: string): Promise<SettingRow> {
    // Persisting JSON serialization at this boundary keeps the QuerySpec itself
    // aligned with the actual SQL placeholder contract.
    return this.catalog.one(upsertSettingSpec, [key, JSON.stringify(value), updatedAt]);
  }

  public async hydrateRuntimeSettings(defaults: RuntimeSettings): Promise<RuntimeSettings> {
    const rows = await this.listAll();
    const settings = new Map(rows.map((row) => [row.key, row.value]));

    return {
      provider: String(settings.get("provider") ?? defaults.provider),
      model: String(settings.get("model") ?? defaults.model),
      personaFile: String(settings.get("personaFile") ?? defaults.personaFile),
      currentThreadId:
        settings.get("currentThreadId") === null || settings.get("currentThreadId") === undefined
          ? null
          : String(settings.get("currentThreadId")),
      contextMessageLimit: Number(
        settings.get("contextMessageLimit") ?? defaults.contextMessageLimit,
      ),
    };
  }
}
