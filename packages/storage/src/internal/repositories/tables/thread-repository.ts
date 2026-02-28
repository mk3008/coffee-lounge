import { createCoffeeCatalog, type CoffeeCatalog } from "../../catalog/executor.js";
import {
  createThreadSpec,
  findThreadByIdSpec,
  listRecentThreadsSpec,
  touchThreadSpec,
} from "../../catalog/entries/thread.entries.js";
import {
  ensureCreateThreadParams,
  ensureFindThreadByIdParams,
  ensureListRecentThreadsParams,
  ensureTouchThreadParams,
} from "../../catalog/runtime/thread.runtime.js";
import type { QueryExecutor } from "../../db/pg-query-executor.js";

export interface ThreadRecordDto {
  threadId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export class ThreadRepository {
  private readonly catalog: CoffeeCatalog;

  public constructor(catalogOrExecutor: CoffeeCatalog | QueryExecutor) {
    this.catalog =
      "one" in catalogOrExecutor && "list" in catalogOrExecutor
        ? catalogOrExecutor
        : createCoffeeCatalog(catalogOrExecutor);
  }

  public async createThread(input: unknown): Promise<ThreadRecordDto> {
    const params = ensureCreateThreadParams(input);
    return this.catalog.one(createThreadSpec, [params.threadId, params.title, params.createdAt]);
  }

  public async findById(input: unknown): Promise<ThreadRecordDto | null> {
    const params = ensureFindThreadByIdParams(input);
    try {
      return await this.catalog.one(findThreadByIdSpec, [params.threadId]);
    } catch (error) {
      if (isNoRowError(error)) {
        return null;
      }
      throw error;
    }
  }

  public async listRecent(input: unknown): Promise<ThreadRecordDto[]> {
    const params = ensureListRecentThreadsParams(input);
    return this.catalog.list(listRecentThreadsSpec, [params.limit]);
  }

  public async touchThread(input: unknown): Promise<void> {
    const params = ensureTouchThreadParams(input);
    try {
      await this.catalog.scalar(touchThreadSpec, [params.threadId, params.timestamp]);
    } catch (error) {
      if (isNoRowError(error)) {
        throw new Error(`thread not found: ${params.threadId}`);
      }
      throw error;
    }
  }
}

function isNoRowError(error: unknown): boolean {
  return error instanceof Error && /Expected exactly one row but received none/.test(error.message);
}
