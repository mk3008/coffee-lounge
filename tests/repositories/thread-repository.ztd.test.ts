import { describe, expect, test } from "vitest";

import { ThreadRepository } from "../../packages/storage/src/internal/repositories/tables/thread-repository.js";
import { tableFixtureWithSchema } from "../generated/ztd-row-map.generated.js";
import { runWithPgFixtures } from "../support/pg-fixture-runner.js";

const testPgUri = process.env.TEST_PG_URI;

describe.skipIf(!testPgUri)("ThreadRepository ZTD", () => {
  test("listRecent returns fixture-backed thread rows", async () => {
    await runWithPgFixtures(
      testPgUri!,
      [
        tableFixtureWithSchema("public.threads", [
          {
            thread_id: "thread-1",
            title: "First thread",
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
            last_message_at: "2025-01-02T00:00:00.000Z",
          },
          {
            thread_id: "thread-2",
            title: "Second thread",
            created_at: "2025-01-03T00:00:00.000Z",
            updated_at: "2025-01-03T00:00:00.000Z",
            last_message_at: "2025-01-04T00:00:00.000Z",
          },
        ]),
      ],
      async (db) => {
        const repository = new ThreadRepository(db);
        const threads = await repository.listRecent({ limit: 10 });

        expect(threads).toHaveLength(2);
        expect(threads[0]?.threadId).toBe("thread-2");
        expect(threads[1]?.threadId).toBe("thread-1");
      },
    );
  });
});
