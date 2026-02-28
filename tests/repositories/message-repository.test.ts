import { describe, expect, test } from "vitest";

import {
  addMessageSpec,
  listMessagesByThreadSpec,
  searchMessagesSpec,
} from "../../packages/storage/src/internal/catalog/entries/message.entries.js";
import { MessageRepository } from "../../packages/storage/src/internal/repositories/tables/message-repository.js";
import { createFakeCatalog } from "../support/fake-catalog.js";

describe("MessageRepository", () => {
  test("addMessage delegates to the add catalog spec", async () => {
    const catalog = createFakeCatalog();
    catalog.one.mockResolvedValue({
      messageId: "message-1",
      threadId: "thread-1",
      role: "user",
      content: "hello",
      provider: "openai",
      model: "gpt-5-codex",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    const repository = new MessageRepository(catalog);

    const message = await repository.addMessage({
      messageId: "message-1",
      threadId: "thread-1",
      role: "user",
      content: "hello",
      provider: "openai",
      model: "gpt-5-codex",
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    expect(message.messageId).toBe("message-1");
    expect(catalog.one).toHaveBeenCalledWith(addMessageSpec, [
      "message-1",
      "thread-1",
      "user",
      "hello",
      "openai",
      "gpt-5-codex",
      "2025-01-01T00:00:00.000Z",
    ]);
  });

  test("listByThread delegates to the list catalog spec", async () => {
    const catalog = createFakeCatalog();
    catalog.list.mockResolvedValue([]);
    const repository = new MessageRepository(catalog);

    await repository.listByThread({ threadId: "thread-1", limit: 10 });
    expect(catalog.list).toHaveBeenCalledWith(listMessagesByThreadSpec, ["thread-1", 10]);
  });

  test("search delegates to the search catalog spec", async () => {
    const catalog = createFakeCatalog();
    catalog.list.mockResolvedValue([]);
    const repository = new MessageRepository(catalog);

    await repository.search({ query: "rep", limit: 10 });
    expect(catalog.list).toHaveBeenCalledWith(searchMessagesSpec, ["%rep%", 10]);
  });
});
