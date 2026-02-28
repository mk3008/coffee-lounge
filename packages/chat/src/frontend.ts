import type { MessageRecord, RuntimeSettings, ThreadRecord } from "@coffee-lounge/storage";

const HISTORY_PREVIEW_LIMIT = 6;

function compactContent(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

export function renderChatBanner(input: {
  thread: ThreadRecord;
  settings: RuntimeSettings;
  attachmentCount: number;
}): string {
  const lines = [
    `Thread: ${input.thread.id} (${input.thread.title})`,
    `Model: ${input.settings.model}`,
    `Persona: ${input.settings.personaFile}`,
  ];

  if (input.attachmentCount > 0) {
    lines.push(`Attachments stored: ${input.attachmentCount}`);
  }

  lines.push("Type /exit to quit.");
  return `${lines.join("\n")}\n`;
}

export function renderThreadHistory(
  messages: MessageRecord[],
  limit = HISTORY_PREVIEW_LIMIT,
): string {
  if (messages.length === 0) {
    return "No messages yet.";
  }

  const visibleMessages = messages.slice(-limit);
  const lines = visibleMessages.map((message) => {
    const content = compactContent(message.content).slice(0, 160);
    return `[${message.role}] ${content}`;
  });

  return lines.join("\n");
}
