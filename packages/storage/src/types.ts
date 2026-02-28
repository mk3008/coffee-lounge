export type MessageRole = "system" | "user" | "assistant";

export interface ThreadRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  provider: string;
  model: string;
  createdAt: string;
}

export interface AttachmentRecord {
  id: string;
  threadId: string;
  messageId: string | null;
  name: string;
  mimeType: string | null;
  filePath: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SearchResult {
  threadId: string;
  threadTitle: string;
  messageId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface RuntimeSettings {
  provider: string;
  model: string;
  personaFile: string;
  currentThreadId: string | null;
  contextMessageLimit: number;
}

export interface ChatStorage {
  initialize(): Promise<void>;
  close(): Promise<void>;
  getDatabasePath(): string;
  getSettings(): Promise<RuntimeSettings>;
  updateSettings(next: Partial<RuntimeSettings>): Promise<RuntimeSettings>;
  createThread(title?: string): Promise<ThreadRecord>;
  listThreads(limit?: number): Promise<ThreadRecord[]>;
  getThread(threadId: string): Promise<ThreadRecord | null>;
  getLatestThread(): Promise<ThreadRecord | null>;
  setCurrentThread(threadId: string | null): Promise<void>;
  addMessage(input: {
    threadId: string;
    role: MessageRole;
    content: string;
    provider: string;
    model: string;
  }): Promise<MessageRecord>;
  listMessages(threadId: string, limit?: number): Promise<MessageRecord[]>;
  searchMessages(query: string, limit?: number): Promise<SearchResult[]>;
  addAttachments(input: {
    threadId: string;
    messageId?: string | null;
    attachments: Array<{
      name: string;
      mimeType?: string | null;
      filePath: string;
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<AttachmentRecord[]>;
  exportTo(targetDirectory: string): Promise<string>;
  importFrom(sourceDirectory: string): Promise<string>;
}
