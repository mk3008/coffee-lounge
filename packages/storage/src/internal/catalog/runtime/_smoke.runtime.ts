import { parseSmokeOutput, type SmokeOutput } from "../specs/_smoke.spec.js";
import { normalizeTimestamp } from "./_coercions.js";

export function ensureSmokeOutput(value: unknown): SmokeOutput {
  if (isRecord(value) && "createdAt" in value) {
    return parseSmokeOutput({
      ...value,
      createdAt: normalizeTimestamp(value.createdAt, "createdAt"),
    });
  }

  return parseSmokeOutput(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
