import { z } from "zod";

export const smokeOutputSchema = z.object({
  id: z.number().int(),
  createdAt: z.date(),
});

export type SmokeOutput = z.infer<typeof smokeOutputSchema>;

export function parseSmokeOutput(value: unknown): SmokeOutput {
  return smokeOutputSchema.parse(value);
}
