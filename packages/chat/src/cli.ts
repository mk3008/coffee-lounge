#!/usr/bin/env node
import { Command } from "commander";

import {
  createApp,
  exportDatabase,
  getConfig,
  importDatabase,
  listThreads,
  runChat,
  searchMessages,
  setConfig,
  switchThread,
} from "./app.js";

const program = new Command()
  .name("coffee")
  .description("CLI wall-chat for coffee-lounge Phase 1")
  .showHelpAfterError();

program
  .command("chat")
  .description("Open the latest thread and start the chat loop")
  .option("--new-thread", "Create a new thread before chatting")
  .option("--thread-id <threadId>", "Open a specific thread")
  .option("--model <model>", "Persist and use a different model")
  .option("--provider <provider>", "Persist and use a different provider")
  .option("--persona-file <path>", "Persist and use a different persona file")
  .option("--attach <path...>", "Store attachment metadata before chatting")
  .action(async (options: {
    newThread?: boolean;
    threadId?: string;
    model?: string;
    provider?: string;
    personaFile?: string;
    attach?: string[];
  }) => {
    const app = await createApp(process.cwd());
    try {
      await runChat(app, {
        newThread: options.newThread,
        threadId: options.threadId,
        model: options.model,
        provider: options.provider,
        personaFile: options.personaFile,
        attach: options.attach,
      });
    } finally {
      await app.storage.close();
    }
  });

program
  .command("threads")
  .description("List recent threads")
  .option("--limit <limit>", "Maximum number of threads", "20")
  .action(async (options: { limit: string }) => {
    const app = await createApp(process.cwd());
    try {
      console.log(await listThreads(app, Number(options.limit)));
    } finally {
      await app.storage.close();
    }
  });

program
  .command("open")
  .description("Switch the current thread")
  .argument("<threadId>", "Thread id")
  .action(async (threadId: string) => {
    const app = await createApp(process.cwd());
    try {
      console.log(await switchThread(app, threadId));
    } finally {
      await app.storage.close();
    }
  });

program
  .command("search")
  .description("Search stored messages")
  .argument("<query>", "Search term")
  .option("--limit <limit>", "Maximum number of matches", "20")
  .action(async (query: string, options: { limit: string }) => {
    const app = await createApp(process.cwd());
    try {
      console.log(await searchMessages(app, query, Number(options.limit)));
    } finally {
      await app.storage.close();
    }
  });

program
  .command("export")
  .description("Export the persisted Postgres dataset to JSON")
  .argument("<directory>", "Destination directory")
  .action(async (directory: string) => {
    const app = await createApp(process.cwd());
    try {
      console.log(await exportDatabase(app, directory));
    } finally {
      await app.storage.close();
    }
  });

program
  .command("import")
  .description("Import the persisted Postgres dataset from JSON")
  .argument("<directory>", "Source directory")
  .action(async (directory: string) => {
    const app = await createApp(process.cwd());
    try {
      console.log(await importDatabase(app, directory));
    } finally {
      await app.storage.close();
    }
  });

program
  .command("config")
  .description("Read or update persisted settings")
  .argument("[key]", "provider | model | personaFile | currentThreadId | contextMessageLimit")
  .argument("[value]", "new value")
  .action(async (key?: keyof import("@coffee-lounge/storage").RuntimeSettings, value?: string) => {
    const app = await createApp(process.cwd());
    try {
      if (!key) {
        console.log(await getConfig(app));
        return;
      }
      if (!value) {
        throw new Error("config update requires both key and value");
      }
      console.log(await setConfig(app, key, value));
    } finally {
      await app.storage.close();
    }
  });

await program.parseAsync();
