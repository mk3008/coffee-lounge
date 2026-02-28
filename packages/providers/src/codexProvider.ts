import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { LlmProvider, ProviderRequest, ProviderResponse } from "./types.js";

interface CodexCliProviderOptions {
  executable?: string;
  workspaceDirectory?: string;
  tempDirectory?: string;
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
    this.executable = options.executable ?? "codex";
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

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(this.executable, args, {
        cwd: this.workspaceDirectory,
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
