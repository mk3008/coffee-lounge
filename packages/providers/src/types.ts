import type { MessageRecord, RuntimeSettings, ThreadRecord } from "@coffee-lounge/storage";

export interface ProviderRequest {
  thread: ThreadRecord;
  messages: MessageRecord[];
  settings: RuntimeSettings;
  persona: string;
  userInput: string;
  onDelta?: (chunk: string) => void;
}

export interface ProviderResponse {
  content: string;
  provider: string;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}
