import { type Pool } from "pg";

import type { AttachmentRecord } from "../types.js";
import { loadStorageSql } from "./storage-sql.js";

export interface AttachmentInput {
  id: string;
  threadId: string;
  messageId: string | null;
  name: string;
  mimeType: string | null;
  filePath: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class AttachmentRepository {
  private readonly pool: Pool;
  private readonly addAttachmentSql = loadStorageSql("attachment/add_attachment.sql");

  public constructor(pool: Pool) {
    this.pool = pool;
  }

  public async addMany(input: AttachmentInput[]): Promise<AttachmentRecord[]> {
    const records: AttachmentRecord[] = [];

    for (const attachment of input) {
      await this.pool.query(
        this.addAttachmentSql,
        [
          attachment.id,
          attachment.threadId,
          attachment.messageId,
          attachment.name,
          attachment.mimeType,
          attachment.filePath,
          JSON.stringify(attachment.metadata),
          attachment.createdAt,
        ],
      );

      records.push({
        id: attachment.id,
        threadId: attachment.threadId,
        messageId: attachment.messageId,
        name: attachment.name,
        mimeType: attachment.mimeType,
        filePath: attachment.filePath,
        metadata: attachment.metadata,
        createdAt: attachment.createdAt,
      });
    }

    return records;
  }
}
