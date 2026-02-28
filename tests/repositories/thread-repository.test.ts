import { describe, expect, test } from "vitest";

import {
  findThreadByIdSpec,
  listRecentThreadsSpec,
  touchThreadSpec,
} from "../../packages/storage/src/internal/catalog/entries/thread.entries.js";
import { ThreadRepository } from "../../packages/storage/src/internal/repositories/tables/thread-repository.js";
import { createFakeCatalog } from "../support/fake-catalog.js";

describe("ThreadRepository", () => {
  test("createThread delegates to the create catalog spec", async () => {
    const catalog = createFakeCatalog();
    catalog.one.mockResolvedValue({
      threadId: "thread-1",
      title: "First",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      lastMessageAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    const repository = new ThreadRepository(catalog);

    const thread = await repository.createThread({
      threadId: "thread-1",
      title: "First",
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    expect(thread.threadId).toBe("thread-1");
    expect(catalog.one).toHaveBeenCalledWith(
      expect.objectContaining({ id: "thread.create" }),
      ["thread-1", "First", "2025-01-01T00:00:00.000Z"],
    );
  });

  test("findById returns null when no row exists", async () => {
    const catalog = createFakeCatalog();
    catalog.one.mockRejectedValue(new Error("Expected exactly one row but received none."));
    const repository = new ThreadRepository(catalog);
    await expect(repository.findById({ threadId: "missing" })).resolves.toBeNull();
    expect(catalog.one).toHaveBeenCalledWith(findThreadByIdSpec, ["missing"]);
  });

  test("listRecent delegates to the list catalog spec", async () => {
    const catalog = createFakeCatalog();
    catalog.list.mockResolvedValue([]);
    const repository = new ThreadRepository(catalog);

    await repository.listRecent({ limit: 5 });
    expect(catalog.list).toHaveBeenCalledWith(listRecentThreadsSpec, [5]);
  });

  test("touchThread fails when the touch catalog returns no rows", async () => {
    const catalog = createFakeCatalog();
    catalog.scalar.mockRejectedValue(new Error("Expected exactly one row but received none."));
    const repository = new ThreadRepository(catalog);

    await expect(
      repository.touchThread({
        threadId: "missing",
        timestamp: "2025-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(/thread not found/);
    expect(catalog.scalar).toHaveBeenCalledWith(touchThreadSpec, [
      "missing",
      "2025-01-01T00:00:00.000Z",
    ]);
  });
});
