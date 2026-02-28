import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { CodexCliProvider } from "@coffee-lounge/providers";
import {
  PgChatStorage,
  type RuntimeSettings,
  type SearchResult,
  type ThreadRecord,
} from "@coffee-lounge/storage";

export interface AppContext {
  storage: PgChatStorage;
  provider: CodexCliProvider;
}

export interface ChatOptions {
  model?: string;
  personaFile?: string;
  provider?: string;
  newThread?: boolean;
  threadId?: string;
  attach?: string[];
}

export interface OpenThreadOptions {
  newThread?: boolean;
  threadId?: string;
}

export async function createApp(rootDirectory: string): Promise<AppContext> {
  const defaultPersonaFile = resolve(rootDirectory, "packages/chat/personas/default.md");
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Postgres storage.");
  }

  const storage = new PgChatStorage({
    connectionString,
    ddlFile: resolve(rootDirectory, "ztd/ddl/public.sql"),
    defaultModel: "gpt-5-codex",
    defaultPersonaFile,
  });

  await storage.initialize();

  return {
    storage,
    provider: new CodexCliProvider({
      workspaceDirectory: rootDirectory,
      tempDirectory: resolve(rootDirectory, "tmp"),
    }),
  };
}

export function applyRuntimeOverrides(
  context: AppContext,
  options: Pick<ChatOptions, "model" | "personaFile" | "provider">,
): Promise<RuntimeSettings> {
  return context.storage.updateSettings({
    model: options.model,
    personaFile: options.personaFile ? resolve(options.personaFile) : undefined,
    provider: options.provider,
  });
}

export async function openThread(
  context: AppContext,
  options: OpenThreadOptions,
): Promise<ThreadRecord> {
  if (options.threadId) {
    const thread = await context.storage.getThread(options.threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${options.threadId}`);
    }
    await context.storage.setCurrentThread(thread.id);
    return thread;
  }

  if (!options.newThread) {
    const currentId = (await context.storage.getSettings()).currentThreadId;
    if (currentId) {
      const currentThread = await context.storage.getThread(currentId);
      if (currentThread) {
        return currentThread;
      }
    }

    const latestThread = await context.storage.getLatestThread();
    if (latestThread) {
      await context.storage.setCurrentThread(latestThread.id);
      return latestThread;
    }
  }

  return context.storage.createThread();
}

export async function runChat(context: AppContext, options: ChatOptions): Promise<void> {
  const settings = await applyRuntimeOverrides(context, options);
  const thread = await openThread(context, options);
  const attached = await persistAttachmentMetadata(context, thread.id, options.attach ?? []);
  const readline = createInterface({ input, output });

  output.write(`Thread: ${thread.id} (${thread.title})\n`);
  output.write(`Model: ${settings.model}\n`);
  output.write(`Persona: ${settings.personaFile}\n`);
  if (attached > 0) {
    output.write(`Attachments stored: ${attached}\n`);
  }
  output.write("Type /exit to quit.\n\n");

  try {
    while (true) {
      const prompt = await readline.question("> ");
      const trimmed = prompt.trim();

      if (trimmed.length === 0) {
        continue;
      }

      if (trimmed === "/exit" || trimmed === "/quit") {
        break;
      }

      if (trimmed === "/help") {
        output.write("/exit, /quit, /help, /attach <path>\n");
        continue;
      }

      if (trimmed.startsWith("/attach ")) {
        const path = trimmed.slice("/attach ".length).trim();
        const count = await persistAttachmentMetadata(context, thread.id, [path]);
        output.write(`Stored ${count} attachment metadata item(s).\n`);
        continue;
      }

      const activeSettings = await context.storage.getSettings();
      const history = await context.storage.listMessages(
        thread.id,
        activeSettings.contextMessageLimit,
      );
      await context.storage.addMessage({
        threadId: thread.id,
        role: "user",
        content: prompt,
        provider: activeSettings.provider,
        model: activeSettings.model,
      });

      output.write("\nassistant> ");

      const response = await context.provider.generate({
        thread,
        messages: history,
        settings: activeSettings,
        persona: loadPersona(activeSettings.personaFile),
        userInput: prompt,
        onDelta: (chunk: string) => {
          output.write(chunk);
        },
      });

      output.write("\n\n");

      await context.storage.addMessage({
        threadId: thread.id,
        role: "assistant",
        content: response.content,
        provider: response.provider,
        model: response.model,
      });
    }
  } finally {
    readline.close();
  }
}

export async function listThreads(context: AppContext, limit: number): Promise<string> {
  const threads = await context.storage.listThreads(limit);

  if (threads.length === 0) {
    return "No threads found.";
  }

  return threads
    .map((thread: ThreadRecord) => `${thread.id}\t${thread.lastMessageAt}\t${thread.title}`)
    .join("\n");
}

export async function switchThread(context: AppContext, threadId: string): Promise<string> {
  const thread = await context.storage.getThread(threadId);
  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`);
  }
  await context.storage.setCurrentThread(thread.id);
  return `Opened ${thread.id} (${thread.title})`;
}

export async function searchMessages(
  context: AppContext,
  query: string,
  limit: number,
): Promise<string> {
  const results = await context.storage.searchMessages(query, limit);

  if (results.length === 0) {
    return "No messages matched.";
  }

  return results
    .map(
      (result: SearchResult) =>
        `${result.createdAt}\t${result.threadId}\t${result.role}\t${result.content.replace(/\s+/g, " ").slice(0, 120)}`,
    )
    .join("\n");
}

export function exportDatabase(context: AppContext, targetDirectory: string): Promise<string> {
  return context.storage.exportTo(targetDirectory);
}

export function importDatabase(context: AppContext, sourceDirectory: string): Promise<string> {
  return context.storage.importFrom(sourceDirectory);
}

export async function getConfig(context: AppContext): Promise<string> {
  return JSON.stringify(await context.storage.getSettings(), null, 2);
}

export async function setConfig(
  context: AppContext,
  key: keyof RuntimeSettings,
  value: string,
): Promise<string> {
  const next: Partial<RuntimeSettings> = {};

  if (key === "contextMessageLimit") {
    next[key] = Number(value) as RuntimeSettings[typeof key];
  } else if (key === "currentThreadId") {
    next[key] = value || null;
  } else {
    next[key] = value as RuntimeSettings[typeof key];
  }

  return JSON.stringify(await context.storage.updateSettings(next), null, 2);
}

async function persistAttachmentMetadata(
  context: AppContext,
  threadId: string,
  paths: string[],
): Promise<number> {
  if (paths.length === 0) {
    return 0;
  }

  const attachments = paths.map((filePath) => {
    const absolutePath = resolve(filePath);
    const stats = existsSync(absolutePath) ? statSync(absolutePath) : null;

    return {
      name: basename(absolutePath),
      filePath: absolutePath,
      metadata: {
        exists: Boolean(stats),
        size: stats?.size ?? null,
      },
    };
  });

  await context.storage.addAttachments({ threadId, attachments });
  return attachments.length;
}

function loadPersona(personaFile: string): string {
  const resolved = resolve(personaFile);
  if (!existsSync(resolved)) {
    throw new Error(`Persona file not found: ${resolved}`);
  }
  return readFileSync(resolved, "utf8");
}
