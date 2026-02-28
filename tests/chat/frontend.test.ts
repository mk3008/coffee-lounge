import { describe, expect, it } from "vitest";

import { renderChatBanner, renderThreadHistory } from "../../packages/chat/src/frontend.js";

describe("chat frontend", () => {
  it("renders a compact session banner", () => {
    expect(
      renderChatBanner({
        thread: {
          id: "thread-1",
          title: "Daily notes",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          lastMessageAt: "2025-01-01T00:00:00.000Z",
        },
        settings: {
          provider: "openai",
          model: "gpt-5-codex",
          personaFile: "persona.md",
          currentThreadId: "thread-1",
          contextMessageLimit: 24,
        },
        attachmentCount: 2,
      }),
    ).toContain("Attachments stored: 2");
  });

  it("renders history in role-first order", () => {
    expect(
      renderThreadHistory([
        {
          id: "message-1",
          threadId: "thread-1",
          role: "user",
          content: "hello\nworld",
          provider: "openai",
          model: "gpt-5-codex",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "message-2",
          threadId: "thread-1",
          role: "assistant",
          content: "reply",
          provider: "openai",
          model: "gpt-5-codex",
          createdAt: "2025-01-01T00:01:00.000Z",
        },
      ]),
    ).toBe("[user] hello world\n[assistant] reply");
  });
});
