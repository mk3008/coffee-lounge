import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildCodexSpawnEnvironment,
  prepareIsolatedCodexHome,
} from "../../packages/providers/src/codexProvider.js";

const createdDirectories: string[] = [];

function createTempDirectory(name: string): string {
  const directory = join(tmpdir(), `coffee-lounge-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(directory, { recursive: true });
  createdDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("isolated codex home", () => {
  it("copies auth.json without copying the global AGENTS.md", () => {
    const sourceHome = createTempDirectory("source-home");
    const tempDirectory = createTempDirectory("provider-temp");
    const sourceCodexDirectory = join(sourceHome, ".codex");

    mkdirSync(sourceCodexDirectory, { recursive: true });
    writeFileSync(join(sourceCodexDirectory, "auth.json"), '{"auth_mode":"chatgpt"}');
    writeFileSync(join(sourceCodexDirectory, "AGENTS.md"), "polluting instructions");

    const isolatedHome = prepareIsolatedCodexHome(tempDirectory, sourceHome);

    expect(existsSync(join(isolatedHome.codexDirectory, "auth.json"))).toBe(true);
    expect(readFileSync(join(isolatedHome.codexDirectory, "auth.json"), "utf8")).toContain(
      '"auth_mode":"chatgpt"',
    );
    expect(existsSync(join(isolatedHome.codexDirectory, "AGENTS.md"))).toBe(false);
  });

  it("rewrites home-related environment variables for the child process", () => {
    const isolatedHome = "C:\\isolated-home";

    expect(
      buildCodexSpawnEnvironment(
        {
          PATH: "test-path",
          HOME: "old-home",
          USERPROFILE: "old-userprofile",
          APPDATA: "old-appdata",
          LOCALAPPDATA: "old-localappdata",
          CODEX_THREAD_ID: "thread-123",
        },
        isolatedHome,
      ),
    ).toEqual({
      PATH: "test-path",
      HOME: isolatedHome,
      USERPROFILE: isolatedHome,
      APPDATA: "C:\\isolated-home\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\isolated-home\\AppData\\Local",
      XDG_CONFIG_HOME: "C:\\isolated-home\\.config",
      XDG_DATA_HOME: "C:\\isolated-home\\.local\\share",
      XDG_STATE_HOME: "C:\\isolated-home\\.local\\state",
      XDG_CACHE_HOME: "C:\\isolated-home\\.cache",
    });
  });
});
