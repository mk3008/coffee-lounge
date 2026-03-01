export function normalizeTimestamp(value: unknown, label: string): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(`Invalid timestamp string for ${label}`);
}
