import { describe, expect, it } from "vitest";

import { mergeRuntimeSettings } from "../../packages/storage/src/pgStorage.js";

describe("mergeRuntimeSettings", () => {
  it("ignores undefined overrides while preserving existing values", () => {
    expect(
      mergeRuntimeSettings(
        {
          provider: "openai",
          model: "gpt-5-codex",
          personaFile: "persona.md",
          currentThreadId: "thread-1",
          contextMessageLimit: 24,
        },
        {
          provider: undefined,
          model: undefined,
          personaFile: undefined,
        },
      ),
    ).toEqual({
      provider: "openai",
      model: "gpt-5-codex",
      personaFile: "persona.md",
      currentThreadId: "thread-1",
      contextMessageLimit: 24,
    });
  });

  it("keeps intentional null values such as clearing the current thread", () => {
    expect(
      mergeRuntimeSettings(
        {
          provider: "openai",
          model: "gpt-5-codex",
          personaFile: "persona.md",
          currentThreadId: "thread-1",
          contextMessageLimit: 24,
        },
        {
          currentThreadId: null,
        },
      ),
    ).toEqual({
      provider: "openai",
      model: "gpt-5-codex",
      personaFile: "persona.md",
      currentThreadId: null,
      contextMessageLimit: 24,
    });
  });
});
