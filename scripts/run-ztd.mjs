import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const cliPath = resolve(process.cwd(), "..", "rawsql-ts", "packages", "ztd-cli", "dist", "index.js");

if (!existsSync(cliPath)) {
  console.error(`Local ztd-cli build not found: ${cliPath}`);
  console.error("Build rawsql-ts first, for example: pnpm --dir ../rawsql-ts --filter @rawsql-ts/ztd-cli build");
  process.exit(1);
}

const child = spawn(process.execPath, [cliPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
