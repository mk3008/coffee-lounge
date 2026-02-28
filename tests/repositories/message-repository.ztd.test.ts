import { describe, expect, test } from "vitest";

import { MessageRepository } from "../../packages/storage/src/internal/repositories/tables/message-repository.js";
import { tableFixtureWithSchema } from "../generated/ztd-row-map.generated.js";
import { runWithPgFixtures } from "../support/pg-fixture-runner.js";

const testPgUri = process.env.TEST_PG_URI;

describe.skipIf(!testPgUri)("MessageRepository ZTD", () => {
  test("listByThread reads messages from fixture-backed rows", async () => {
    await runWithPgFixtures(
      testPgUri!,
      [
        tableFixtureWithSchema("public.threads", [
          {
            thread_id: "thread-1",
            title: "Fixture thread",
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            last_message_at: "2025-01-01T00:00:00.000Z",
          },
        ]),
        tableFixtureWithSchema("public.messages", [
          {
            message_id: "message-1",
            thread_id: "thread-1",
            role: "user",
            content: "hello fixture",
            provider: "openai",
            model: "gpt-5-codex",
            created_at: "2025-01-01T00:00:00.000Z",
          },
          {
            message_id: "message-2",
            thread_id: "thread-1",
            role: "assistant",
            content: "reply fixture",
            provider: "openai",
            model: "gpt-5-codex",
            created_at: "2025-01-01T00:01:00.000Z",
          },
        ]),
      ],
      async (db) => {
        const repository = new MessageRepository(db);
        const messages = await repository.listByThread({
          threadId: "thread-1",
          limit: 10,
        });

        expect(messages).toHaveLength(2);
        expect(messages[0]?.messageId).toBe("message-2");
        expect(messages[1]?.messageId).toBe("message-1");
      },
    );
  });
});
