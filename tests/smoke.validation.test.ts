import { expect, test } from "vitest";

import { ensureSmokeOutput } from "../packages/storage/src/internal/catalog/runtime/_smoke.runtime.js";

test("validator invariant smoke passes for valid runtime output", () => {
  const output = ensureSmokeOutput({
    id: 1,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  });

  expect(output).toEqual({
    id: 1,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  });
});
