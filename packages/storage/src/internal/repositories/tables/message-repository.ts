import { createCoffeeCatalog, type CoffeeCatalog } from "../../catalog/executor.js";
import {
  addMessageSpec,
  listMessagesByThreadSpec,
  searchMessagesSpec,
} from "../../catalog/entries/message.entries.js";
import {
  ensureAddMessageParams,
  ensureListMessagesByThreadParams,
  ensureSearchMessagesParams,
} from "../../catalog/runtime/message.runtime.js";
import type { QueryExecutor } from "../../db/pg-query-executor.js";

export interface MessageRecordDto {
  messageId: string;
  threadId: string;
  role: "system" | "user" | "assistant";
  content: string;
  provider: string;
  model: string;
  createdAt: Date;
}

export interface SearchMessageDto extends MessageRecordDto {
  threadTitle: string;
}

export class MessageRepository {
  private readonly catalog: CoffeeCatalog;

  public constructor(catalogOrExecutor: CoffeeCatalog | QueryExecutor) {
    this.catalog =
      "one" in catalogOrExecutor && "list" in catalogOrExecutor
        ? catalogOrExecutor
        : createCoffeeCatalog(catalogOrExecutor);
  }

  public async addMessage(input: unknown): Promise<MessageRecordDto> {
    const params = ensureAddMessageParams(input);
    return this.catalog.one(addMessageSpec, [
      params.messageId,
      params.threadId,
      params.role,
      params.content,
      params.provider,
      params.model,
      params.createdAt,
    ]);
  }

  public async listByThread(input: unknown): Promise<MessageRecordDto[]> {
    const params = ensureListMessagesByThreadParams(input);
    return this.catalog.list(listMessagesByThreadSpec, [params.threadId, params.limit]);
  }

  public async search(input: unknown): Promise<SearchMessageDto[]> {
    const params = ensureSearchMessagesParams(input);
    return this.catalog.list(searchMessagesSpec, [`%${params.query}%`, params.limit]);
  }
}
