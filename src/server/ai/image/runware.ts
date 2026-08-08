import { msg } from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import { serverEnv } from "@/server/env";

// One endpoint for every task type; body is an array of tasks, response {data}|{errors}.
const RUNWARE_ENDPOINT = "https://api.runware.ai/v1";

export type RunwareErrors = { code?: string; message?: string }[];

function requireKey(): string {
  const key = serverEnv.runwareApiKey;
  if (!key) {
    logger.error("runware api key is not configured", { context: "image" });
    throw new Error(msg("ERRORS.UNEXPECTED_ERROR"));
  }
  return key;
}

export async function runwareTask<T>(
  task: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ data?: T[]; errors?: RunwareErrors }> {
  const res = await fetch(RUNWARE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
    },
    // taskUUID must be a hyphenated UUIDv4; Runware rejects any other shape.
    body: JSON.stringify([{ taskUUID: crypto.randomUUID(), ...task }]),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return (await res.json()) as { data?: T[]; errors?: RunwareErrors };
}
