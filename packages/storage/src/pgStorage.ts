import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { Pool } from "pg";

import {
  MessageRepository,
  PgQueryExecutor,
  SettingsRepository,
  ThreadRepository,
} from "./internal/catalog-repositories.js";
import { AttachmentRepository } from "./internal/attachment-repository.js";
import { SnapshotRepository } from "./internal/snapshot-repository.js";
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

const DEFAULT_CONTEXT_MESSAGE_LIMIT = 24;

function nowIso(): string {
  return new Date().toISOString();
}

export function mergeRuntimeSettings(
  current: RuntimeSettings,
  next: Partial<RuntimeSettings>,
): RuntimeSettings {
  const definedEntries = Object.entries(next).filter(([, value]) => value !== undefined);

  return {
    ...current,
    ...Object.fromEntries(definedEntries),
  };
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
  private readonly attachmentRepository: AttachmentRepository;
  private readonly snapshotRepository: SnapshotRepository;

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
    this.attachmentRepository = new AttachmentRepository(this.pool);
    this.snapshotRepository = new SnapshotRepository(this.pool, this.exportFileName);
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
    const merged = mergeRuntimeSettings(await this.getSettings(), next);
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
    const attachments = input.attachments.map((attachment) => ({
      id: randomUUID(),
      threadId: input.threadId,
      messageId: input.messageId ?? null,
      name: attachment.name,
      mimeType: attachment.mimeType ?? null,
      filePath: resolve(attachment.filePath),
      metadata: attachment.metadata ?? {},
      createdAt: nowIso(),
    }));

    return this.attachmentRepository.addMany(attachments);
  }

  public async exportTo(targetDirectory: string): Promise<string> {
    mkdirSync(resolve(targetDirectory), { recursive: true });
    return this.snapshotRepository.exportTo(targetDirectory);
  }

  public async importFrom(sourceDirectory: string): Promise<string> {
    const sourcePath = resolve(sourceDirectory, this.exportFileName);

    if (!existsSync(sourcePath)) {
      throw new Error(`Backup file not found: ${sourcePath}`);
    }

    return this.snapshotRepository.importFrom(sourceDirectory);
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
