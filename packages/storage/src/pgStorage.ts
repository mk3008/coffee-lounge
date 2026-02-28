import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { Pool, type PoolClient } from "pg";

import {
  MessageRepository,
  PgQueryExecutor,
  SettingsRepository,
  ThreadRepository,
} from "./internal/catalog-repositories.js";
import type {
  AttachmentRecord,
  ChatStorage,
  MessageRecord,
  RuntimeSettings,
  SearchResult,
  ThreadRecord,
} from "./types.js";

interface PgStorageOptions {
  connectionString: string;
  ddlFile: string;
  exportFileName?: string;
  defaultModel: string;
  defaultPersonaFile: string;
  defaultProvider?: string;
}

type SettingValue = string | number | null;

const DEFAULT_CONTEXT_MESSAGE_LIMIT = 24;

function nowIso(): string {
  return new Date().toISOString();
}

export class PgChatStorage implements ChatStorage {
  private readonly pool: Pool;
  private readonly ddlFile: string;
  private readonly exportFileName: string;
  private readonly defaultProvider: string;
  private readonly defaultModel: string;
  private readonly defaultPersonaFile: string;
  private readonly threadRepository: ThreadRepository;
  private readonly messageRepository: MessageRepository;
  private readonly settingsRepository: SettingsRepository;

  public constructor(options: PgStorageOptions) {
    this.pool = new Pool({
      connectionString: options.connectionString,
    });
    this.ddlFile = resolve(options.ddlFile);
    this.exportFileName = options.exportFileName ?? "coffee-lounge-export.json";
    this.defaultProvider = options.defaultProvider ?? "openai";
    this.defaultModel = options.defaultModel;
    this.defaultPersonaFile = options.defaultPersonaFile;
    const queryExecutor = new PgQueryExecutor(this.pool);
    this.threadRepository = new ThreadRepository(queryExecutor);
    this.messageRepository = new MessageRepository(queryExecutor);
    this.settingsRepository = new SettingsRepository(queryExecutor);
  }

  public async initialize(): Promise<void> {
    const ddl = readFileSync(this.ddlFile, "utf8");
    await this.pool.query(ddl);
    await this.ensureDefaultSettings();
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public getDatabasePath(): string {
    return this.pool.options.connectionString ?? "";
  }

  public async getSettings(): Promise<RuntimeSettings> {
    return this.settingsRepository.hydrateRuntimeSettings({
      provider: this.defaultProvider,
      model: this.defaultModel,
      personaFile: this.defaultPersonaFile,
      currentThreadId: null,
      contextMessageLimit: DEFAULT_CONTEXT_MESSAGE_LIMIT,
    });
  }

  public async updateSettings(next: Partial<RuntimeSettings>): Promise<RuntimeSettings> {
    const merged = { ...(await this.getSettings()), ...next };
    const updatedAt = nowIso();

    // Persist every logical runtime key as JSON so schema evolution stays simple.
    for (const [key, value] of Object.entries(merged)) {
      await this.settingsRepository.upsert(key, value, updatedAt);
    }

    return merged;
  }

  public async createThread(title = "Untitled thread"): Promise<ThreadRecord> {
    const id = randomUUID();
    const timestamp = nowIso();

    const thread = await this.threadRepository.create(id, title, timestamp);
    await this.setCurrentThread(id);
    return thread;
  }

  public async listThreads(limit = 20): Promise<ThreadRecord[]> {
    return this.threadRepository.listRecent(limit);
  }

  public async getThread(threadId: string): Promise<ThreadRecord | null> {
    return this.threadRepository.findById(threadId);
  }

  public async getLatestThread(): Promise<ThreadRecord | null> {
    const rows = await this.threadRepository.listRecent(1);
    return rows[0] ?? null;
  }

  public async setCurrentThread(threadId: string | null): Promise<void> {
    await this.updateSettings({ currentThreadId: threadId });
  }

  public async addMessage(input: {
    threadId: string;
    role: "system" | "user" | "assistant";
    content: string;
    provider: string;
    model: string;
  }): Promise<MessageRecord> {
    const id = randomUUID();
    const timestamp = nowIso();

    const message = await this.messageRepository.add({
      messageId: id,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      provider: input.provider,
      model: input.model,
      createdAt: timestamp,
    });
    await this.threadRepository.touch(input.threadId, timestamp);
    return message;
  }

  public async listMessages(threadId: string, limit = 50): Promise<MessageRecord[]> {
    return this.messageRepository.listByThread(threadId, limit);
  }

  public async searchMessages(query: string, limit = 20): Promise<SearchResult[]> {
    return this.messageRepository.search(query, limit);
  }

  public async addAttachments(input: {
    threadId: string;
    messageId?: string | null;
    attachments: Array<{
      name: string;
      mimeType?: string | null;
      filePath: string;
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<AttachmentRecord[]> {
    const records: AttachmentRecord[] = [];

    for (const attachment of input.attachments) {
      const record: AttachmentRecord = {
        id: randomUUID(),
        threadId: input.threadId,
        messageId: input.messageId ?? null,
        name: attachment.name,
        mimeType: attachment.mimeType ?? null,
        filePath: resolve(attachment.filePath),
        metadata: attachment.metadata ?? {},
        createdAt: nowIso(),
      };

      await this.pool.query(
        `
          INSERT INTO public.attachments (
            attachment_id,
            thread_id,
            message_id,
            name,
            mime_type,
            file_path,
            metadata_json,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
        `,
        [
          record.id,
          record.threadId,
          record.messageId,
          record.name,
          record.mimeType,
          record.filePath,
          JSON.stringify(record.metadata),
          record.createdAt,
        ],
      );

      records.push(record);
    }

    return records;
  }

  public async exportTo(targetDirectory: string): Promise<string> {
    mkdirSync(resolve(targetDirectory), { recursive: true });
    const targetPath = resolve(targetDirectory, this.exportFileName);
    const payload = {
      threads: (await this.pool.query("SELECT * FROM public.threads ORDER BY created_at ASC")).rows,
      messages: (await this.pool.query("SELECT * FROM public.messages ORDER BY created_at ASC")).rows,
      attachments: (
        await this.pool.query("SELECT * FROM public.attachments ORDER BY created_at ASC")
      ).rows,
      settings: (await this.pool.query("SELECT * FROM public.settings ORDER BY key ASC")).rows,
    };

    writeFileSync(targetPath, JSON.stringify(payload, null, 2));
    return targetPath;
  }

  public async importFrom(sourceDirectory: string): Promise<string> {
    const sourcePath = resolve(sourceDirectory, this.exportFileName);

    if (!existsSync(sourcePath)) {
      throw new Error(`Backup file not found: ${sourcePath}`);
    }

    const payload = JSON.parse(readFileSync(sourcePath, "utf8")) as {
      threads: Array<Record<string, unknown>>;
      messages: Array<Record<string, unknown>>;
      attachments: Array<Record<string, unknown>>;
      settings: Array<Record<string, unknown>>;
    };

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Replace the logical dataset atomically so imports cannot leave partial state behind.
      await client.query("TRUNCATE public.attachments, public.messages, public.threads, public.settings CASCADE");

      for (const row of payload.threads) {
        await client.query(
          `
            INSERT INTO public.threads (thread_id, title, created_at, updated_at, last_message_at)
            VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz)
          `,
          [row.thread_id, row.title, row.created_at, row.updated_at, row.last_message_at],
        );
      }

      for (const row of payload.messages) {
        await client.query(
          `
            INSERT INTO public.messages (message_id, thread_id, role, content, provider, model, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
          `,
          [
            row.message_id,
            row.thread_id,
            row.role,
            row.content,
            row.provider,
            row.model,
            row.created_at,
          ],
        );
      }

      for (const row of payload.attachments) {
        await client.query(
          `
            INSERT INTO public.attachments (
              attachment_id,
              thread_id,
              message_id,
              name,
              mime_type,
              file_path,
              metadata_json,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
          `,
          [
            row.attachment_id,
            row.thread_id,
            row.message_id,
            row.name,
            row.mime_type,
            row.file_path,
            JSON.stringify(row.metadata_json ?? {}),
            row.created_at,
          ],
        );
      }

      for (const row of payload.settings) {
        await client.query(
          `
            INSERT INTO public.settings (key, value_json, updated_at)
            VALUES ($1, $2::jsonb, $3::timestamptz)
          `,
          [row.key, JSON.stringify(row.value_json), row.updated_at],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return sourcePath;
  }

  private async ensureDefaultSettings(): Promise<void> {
    const defaults: RuntimeSettings = {
      provider: this.defaultProvider,
      model: this.defaultModel,
      personaFile: this.defaultPersonaFile,
      currentThreadId: null,
      contextMessageLimit: DEFAULT_CONTEXT_MESSAGE_LIMIT,
    };
    const updatedAt = nowIso();

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.settingsRepository.getByKey(key);

      if (!existing) {
        await this.settingsRepository.upsert(key, value, updatedAt);
      }
    }
  }
}
