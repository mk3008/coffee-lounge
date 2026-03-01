import { describe, expect, it } from "vitest";

import {
  buildCodexSpawnEnvironment,
  buildCodexSpawnPlan,
  resolveCodexExecutable,
} from "../../packages/providers/src/codexProvider.js";

describe("resolveCodexExecutable", () => {
  it("prefers an explicit executable when provided", () => {
    expect(resolveCodexExecutable("custom-codex")).toBe("custom-codex");
  });

  it("returns the Windows shim on win32", () => {
    expect(resolveCodexExecutable(undefined, "win32")).toBe("codex.cmd");
  });

  it("wraps the Windows cmd shim via cmd.exe", () => {
    expect(buildCodexSpawnPlan("codex.cmd", ["exec", "--help"], "win32")).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "codex.cmd", "exec", "--help"],
    });
  });

  it("uses the executable directly on non-Windows platforms", () => {
    expect(buildCodexSpawnPlan("codex", ["exec", "--help"], "linux")).toEqual({
      command: "codex",
      args: ["exec", "--help"],
    });
  });

  it("drops parent CODEX_* variables before spawning the child agent", () => {
    expect(
      buildCodexSpawnEnvironment({
        PATH: "test-path",
        HOME: "test-home",
        CODEX_THREAD_ID: "thread-123",
        CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "codex_vscode",
      }),
    ).toEqual({
      PATH: "test-path",
      HOME: "test-home",
    });
  });
});
