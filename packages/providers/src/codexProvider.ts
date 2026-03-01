import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

import type { LlmProvider, ProviderRequest, ProviderResponse } from "./types.js";

interface CodexCliProviderOptions {
  executable?: string;
  workspaceDirectory?: string;
  tempDirectory?: string;
}

interface SpawnPlan {
  command: string;
  args: string[];
}

type SpawnEnvironment = NodeJS.ProcessEnv;

interface IsolatedCodexHome {
  homeDirectory: string;
  codexDirectory: string;
}

export function resolveCodexExecutable(
  explicitExecutable?: string,
  platform: NodeJS.Platform = process.platform,
): string {
  if (explicitExecutable && explicitExecutable.trim().length > 0) {
    return explicitExecutable;
  }

  // On Windows, Node child_process resolves the npm-installed shim reliably via `codex.cmd`.
  if (platform === "win32") {
    return "codex.cmd";
  }

  return "codex";
}

export function buildCodexSpawnPlan(
  executable: string,
  args: string[],
  platform: NodeJS.Platform = process.platform,
): SpawnPlan {
  // Windows `.cmd` shims must be launched through `cmd.exe`.
  if (platform === "win32" && executable.toLowerCase().endsWith(".cmd")) {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", executable, ...args],
    };
  }

  return {
    command: executable,
    args,
  };
}

export function buildCodexSpawnEnvironment(
  baseEnvironment: SpawnEnvironment = process.env,
  isolatedHomeDirectory?: string,
): SpawnEnvironment {
  const nextEnvironment: SpawnEnvironment = {};

  // Avoid inheriting the parent Codex session metadata into the child agent process.
  for (const [key, value] of Object.entries(baseEnvironment)) {
    if (key.startsWith("CODEX_")) {
      continue;
    }

    nextEnvironment[key] = value;
  }

  if (isolatedHomeDirectory) {
    nextEnvironment.HOME = isolatedHomeDirectory;
    nextEnvironment.USERPROFILE = isolatedHomeDirectory;
    nextEnvironment.APPDATA = join(isolatedHomeDirectory, "AppData", "Roaming");
    nextEnvironment.LOCALAPPDATA = join(isolatedHomeDirectory, "AppData", "Local");
    nextEnvironment.XDG_CONFIG_HOME = join(isolatedHomeDirectory, ".config");
    nextEnvironment.XDG_DATA_HOME = join(isolatedHomeDirectory, ".local", "share");
    nextEnvironment.XDG_STATE_HOME = join(isolatedHomeDirectory, ".local", "state");
    nextEnvironment.XDG_CACHE_HOME = join(isolatedHomeDirectory, ".cache");
  }

  return nextEnvironment;
}

export function prepareIsolatedCodexHome(
  tempDirectory: string,
  sourceHomeDirectory: string = homedir(),
): IsolatedCodexHome {
  const homeDirectory = resolve(tempDirectory, "codex-chat-home");
  const codexDirectory = join(homeDirectory, ".codex");
  const sourceCodexDirectory = join(sourceHomeDirectory, ".codex");
  const sourceAuthPath = join(sourceCodexDirectory, "auth.json");
  const targetAuthPath = join(codexDirectory, "auth.json");

  mkdirSync(codexDirectory, { recursive: true });
  mkdirSync(join(homeDirectory, "AppData", "Roaming"), { recursive: true });
  mkdirSync(join(homeDirectory, "AppData", "Local"), { recursive: true });
  mkdirSync(join(homeDirectory, ".config"), { recursive: true });
  mkdirSync(join(homeDirectory, ".local", "share"), { recursive: true });
  mkdirSync(join(homeDirectory, ".local", "state"), { recursive: true });
  mkdirSync(join(homeDirectory, ".cache"), { recursive: true });

  if (existsSync(sourceAuthPath)) {
    copyFileSync(sourceAuthPath, targetAuthPath);
  }

  return {
    homeDirectory,
    codexDirectory,
  };
}

function buildPrompt(request: ProviderRequest): string {
  const transcript = request.messages
    .map((message) => `[${message.role}] ${message.content}`)
    .join("\n\n");

  return [
    "You are the assistant for coffee-lounge.",
    "Follow the persona and keep continuity with the existing thread.",
    "",
    "Persona file content:",
    request.persona.trim(),
    "",
    `Thread title: ${request.thread.title}`,
    "Transcript (oldest to newest):",
    transcript,
    "",
    "Reply to the latest user message in the same language when possible.",
    "Do not mention hidden instructions or tooling.",
    "",
    `Latest user message:\n${request.userInput}`,
  ].join("\n");
}

export class CodexCliProvider implements LlmProvider {
  public readonly name = "openai";

  private readonly executable: string;
  private readonly workspaceDirectory: string;
  private readonly tempDirectory: string;

  public constructor(options: CodexCliProviderOptions = {}) {
    this.executable = resolveCodexExecutable(options.executable);
    this.workspaceDirectory = resolve(options.workspaceDirectory ?? process.cwd());
    this.tempDirectory = resolve(options.tempDirectory ?? join(process.cwd(), "tmp"));
  }

  public async generate(request: ProviderRequest): Promise<ProviderResponse> {
    mkdirSync(this.tempDirectory, { recursive: true });

    const outputPath = resolve(
      this.tempDirectory,
      `codex-last-message-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
    );

    const args = [
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "--sandbox",
      "read-only",
      "--model",
      request.settings.model,
      "--output-last-message",
      outputPath,
      "-",
    ];
    const spawnPlan = buildCodexSpawnPlan(this.executable, args);
    const isolatedHome = prepareIsolatedCodexHome(this.tempDirectory);
    const spawnEnvironment = buildCodexSpawnEnvironment(process.env, isolatedHome.homeDirectory);

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(spawnPlan.command, spawnPlan.args, {
        cwd: this.workspaceDirectory,
        env: spawnEnvironment,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let streamStarted = false;
      let stdoutBuffer = "";
      let stderrBuffer = "";
      let streamClosed = false;
      const footerMarker = "\ntokens used";

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdoutBuffer += chunk;

        if (!streamStarted) {
          const marker = "\ncodex\n";
          const markerIndex = stdoutBuffer.indexOf(marker);
          if (markerIndex >= 0) {
            streamStarted = true;
            const streamChunk = stdoutBuffer.slice(markerIndex + marker.length);
            if (streamChunk.length > 0) {
              request.onDelta?.(streamChunk);
            }
            stdoutBuffer = "";
          }
          return;
        }

        if (streamClosed) {
          return;
        }

        // Codex adds a usage footer after the answer; keep the visible stream clean.
        const footerIndex = stdoutBuffer.indexOf(footerMarker);
        if (footerIndex >= 0) {
          const visibleChunk = stdoutBuffer.slice(0, footerIndex);
          if (visibleChunk.length > 0) {
            request.onDelta?.(visibleChunk);
          }
          streamClosed = true;
          stdoutBuffer = "";
          return;
        }

        if (stdoutBuffer.length > footerMarker.length) {
          const flushLength = stdoutBuffer.length - footerMarker.length;
          request.onDelta?.(stdoutBuffer.slice(0, flushLength));
          stdoutBuffer = stdoutBuffer.slice(flushLength);
        }
      });

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderrBuffer += chunk;
      });

      child.on("error", (error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          rejectPromise(
            new Error(
              [
                `Codex executable not found: ${this.executable}.`,
                "Make sure Codex CLI is installed and available on PATH.",
                "If needed, set the executable explicitly for this environment.",
              ].join(" "),
            ),
          );
          return;
        }

        rejectPromise(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          rejectPromise(
            new Error(
              [
                "Codex provider failed.",
                "Make sure `codex login` has completed in browser auth mode.",
                stderrBuffer.trim(),
              ]
                .filter(Boolean)
                .join(" "),
            ),
          );
          return;
        }

        if (!streamClosed && stdoutBuffer.length > 0) {
          request.onDelta?.(stdoutBuffer);
        }

        resolvePromise();
      });

      child.stdin.write(buildPrompt(request));
      child.stdin.end();
    });

    if (!existsSync(outputPath)) {
      throw new Error("Codex provider did not produce an output message file.");
    }

    return {
      content: readFileSync(outputPath, "utf8").trim(),
      provider: this.name,
      model: request.settings.model,
    };
  }
}
