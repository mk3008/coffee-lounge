import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { type Pool, type PoolClient } from "pg";

import { withTransaction } from "./db/with-transaction.js";
import { loadStorageSql } from "./storage-sql.js";

interface SnapshotPayload {
  threads: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  settings: Array<Record<string, unknown>>;
}

export class SnapshotRepository {
  private readonly pool: Pool;
  private readonly exportFileName: string;
  private readonly selectThreadsSql = loadStorageSql("snapshot/select_threads_for_export.sql");
  private readonly selectMessagesSql = loadStorageSql("snapshot/select_messages_for_export.sql");
  private readonly selectAttachmentsSql = loadStorageSql("snapshot/select_attachments_for_export.sql");
  private readonly selectSettingsSql = loadStorageSql("snapshot/select_settings_for_export.sql");
  private readonly truncateSnapshotTablesSql = loadStorageSql("snapshot/truncate_snapshot_tables.sql");
  private readonly insertThreadSql = loadStorageSql("snapshot/insert_thread_snapshot_row.sql");
  private readonly insertMessageSql = loadStorageSql("snapshot/insert_message_snapshot_row.sql");
  private readonly insertAttachmentSql = loadStorageSql("snapshot/insert_attachment_snapshot_row.sql");
  private readonly insertSettingSql = loadStorageSql("snapshot/insert_setting_snapshot_row.sql");

  public constructor(pool: Pool, exportFileName: string) {
    this.pool = pool;
    this.exportFileName = exportFileName;
  }

  public async exportTo(targetDirectory: string): Promise<string> {
    const targetPath = resolve(targetDirectory, this.exportFileName);
    const payload: SnapshotPayload = {
      threads: (await this.pool.query(this.selectThreadsSql)).rows,
      messages: (await this.pool.query(this.selectMessagesSql)).rows,
      attachments: (await this.pool.query(this.selectAttachmentsSql)).rows,
      settings: (await this.pool.query(this.selectSettingsSql)).rows,
    };

    writeFileSync(targetPath, JSON.stringify(payload, null, 2));
    return targetPath;
  }

  public async importFrom(sourceDirectory: string): Promise<string> {
    const sourcePath = resolve(sourceDirectory, this.exportFileName);
    const payload = JSON.parse(readFileSync(sourcePath, "utf8")) as SnapshotPayload;

    await withTransaction(this.pool, async (client) => {
      // Replace the logical dataset atomically so imports cannot leave partial state behind.
      await client.query(this.truncateSnapshotTablesSql);

      await this.insertThreads(client, payload.threads);
      await this.insertMessages(client, payload.messages);
      await this.insertAttachments(client, payload.attachments);
      await this.insertSettings(client, payload.settings);
    });

    return sourcePath;
  }

  private async insertThreads(
    client: PoolClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    for (const row of rows) {
      await client.query(this.insertThreadSql, [
        row.thread_id,
        row.title,
        row.created_at,
        row.updated_at,
        row.last_message_at,
      ]);
    }
  }

  private async insertMessages(
    client: PoolClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    for (const row of rows) {
      await client.query(this.insertMessageSql, [
        row.message_id,
        row.thread_id,
        row.role,
        row.content,
        row.provider,
        row.model,
        row.created_at,
      ]);
    }
  }

  private async insertAttachments(
    client: PoolClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    for (const row of rows) {
      await client.query(this.insertAttachmentSql, [
        row.attachment_id,
        row.thread_id,
        row.message_id,
        row.name,
        row.mime_type,
        row.file_path,
        JSON.stringify(row.metadata_json ?? {}),
        row.created_at,
      ]);
    }
  }

  private async insertSettings(
    client: PoolClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    for (const row of rows) {
      await client.query(this.insertSettingSql, [
        row.key,
        JSON.stringify(row.value_json),
        row.updated_at,
      ]);
    }
  }
}
