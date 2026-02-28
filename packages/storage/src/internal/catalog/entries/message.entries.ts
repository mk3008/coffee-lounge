import type { QuerySpec } from "../rawsql-contract.js";
import { rowMapping } from "../rawsql-contract.js";
import { mappedOutput } from "../spec-helpers.js";
import {
  ensureMessageDto,
  ensureSearchMessageDto,
} from "../runtime/message.runtime.js";
import type {
  MessageDto,
  SearchMessageDto,
} from "../specs/message.spec.js";

type AddMessageCatalogParams = [
  messageId: string,
  threadId: string,
  role: "system" | "user" | "assistant",
  content: string,
  provider: string,
  model: string,
  createdAt: string,
];
type ListMessagesByThreadCatalogParams = [threadId: string, limit: number];
type SearchMessagesCatalogParams = [query: string, limit: number];

const messageMapping = rowMapping<MessageDto>({
  name: "MessageDto",
  key: "messageId",
  columnMap: {
    messageId: "message_id",
    threadId: "thread_id",
    role: "role",
    content: "content",
    provider: "provider",
    model: "model",
    createdAt: "created_at",
  },
});

const searchMessageMapping = rowMapping<SearchMessageDto>({
  name: "SearchMessageDto",
  key: "messageId",
  columnMap: {
    messageId: "message_id",
    threadId: "thread_id",
    role: "role",
    content: "content",
    provider: "provider",
    model: "model",
    createdAt: "created_at",
    threadTitle: "thread_title",
  },
});

export const addMessageSpec: QuerySpec<AddMessageCatalogParams, MessageDto> = {
  id: "message.add",
  sqlFile: "message/add_message.sql",
  params: {
    shape: "positional",
    example: [
      "message-1",
      "thread-1",
      "user",
      "hello",
      "openai",
      "gpt-5-codex",
      "2025-01-01T00:00:00.000Z",
    ],
  },
  output: mappedOutput({
    mapping: messageMapping,
    validate: ensureMessageDto,
    example: {
      messageId: "message-1",
      threadId: "thread-1",
      role: "user",
      content: "hello",
      provider: "openai",
      model: "gpt-5-codex",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    },
  }),
};

export const listMessagesByThreadSpec: QuerySpec<ListMessagesByThreadCatalogParams, MessageDto> = {
  id: "message.listByThread",
  sqlFile: "message/list_messages_by_thread_id.sql",
  params: { shape: "positional", example: ["thread-1", 20] },
  output: mappedOutput({
    mapping: messageMapping,
    validate: ensureMessageDto,
    example: addMessageSpec.output.example,
  }),
};

export const searchMessagesSpec: QuerySpec<SearchMessagesCatalogParams, SearchMessageDto> = {
  id: "message.search",
  sqlFile: "message/search_messages.sql",
  params: { shape: "positional", example: ["%hello%", 20] },
  output: mappedOutput({
    mapping: searchMessageMapping,
    validate: ensureSearchMessageDto,
    example: {
      ...addMessageSpec.output.example,
      threadTitle: "First",
    },
  }),
};
