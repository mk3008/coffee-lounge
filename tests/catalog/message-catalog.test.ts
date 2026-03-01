import { describe, expect, test } from "vitest";

import { createCoffeeCatalog } from "../../packages/storage/src/internal/catalog/executor.js";
import {
  addMessageSpec,
  searchMessagesSpec,
} from "../../packages/storage/src/internal/catalog/entries/message.entries.js";
import { createCatalogQueryExecutor } from "../support/catalog-query-executor.js";

describe("message catalog", () => {
  test("maps an inserted message row", async () => {
    const catalog = createCoffeeCatalog(
      createCatalogQueryExecutor([
        {
          message_id: "message-1",
          thread_id: "thread-1",
          role: "user",
          content: "hello",
          provider: "openai",
          model: "gpt-5-codex",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ]),
    );

    const row = await catalog.one(addMessageSpec, [
      "message-1",
      "thread-1",
      "user",
      "hello",
      "openai",
      "gpt-5-codex",
      "2025-01-01T00:00:00.000Z",
    ]);

    expect(row.messageId).toBe("message-1");
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  test("maps search rows including thread title", async () => {
    const catalog = createCoffeeCatalog(
      createCatalogQueryExecutor([
        {
          message_id: "message-1",
          thread_id: "thread-1",
          role: "assistant",
          content: "reply",
          provider: "openai",
          model: "gpt-5-codex",
          created_at: "2025-01-01T00:00:00.000Z",
          thread_title: "First",
        },
      ]),
    );

    const rows = await catalog.list(searchMessagesSpec, ["%rep%", 10]);
    expect(rows[0]?.threadTitle).toBe("First");
  });
});
