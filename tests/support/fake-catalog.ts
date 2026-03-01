import { vi } from "vitest";

import type { CoffeeCatalog } from "../../packages/storage/src/internal/catalog/executor.js";

export function createFakeCatalog() {
  return {
    one: vi.fn(),
    list: vi.fn(),
    scalar: vi.fn(),
  } as CoffeeCatalog & {
    one: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    scalar: ReturnType<typeof vi.fn>;
  };
}
