import {
  GUEST_USER_ID,
  MODERATION_TIMEOUT_MS,
  msg,
} from "@/lib/config/constants";
import { getDb } from "@/lib/db/server/client";
import { moderationLog } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { serverEnv } from "@/server/env";

export type ModerationDecision = "allow" | "flag" | "deny" | "error";

export type ModerationResult =
  | { allowed: true; id: string; units: number; latencyMs: number }
  | {
      allowed: false;
      reason: "deny" | "flag" | "error";
      id?: string;
      latencyMs: number;
    };

export type ModerationContext = {
  prompt: string;
  userId: number | "guest";
  convId: string | null | undefined;
  model: string;
  mediaType: "image" | "video";
};

type CreemResponse = {
  id?: string;
  object?: string;
  prompt?: string;
  external_id?: string;
  decision?: "allow" | "flag" | "deny";
  usage?: { units?: number };
};

function buildExternalId(
  userId: number | "guest",
  convId: string | null | undefined,
): string {
  return `${userId}:${convId ?? "tmp"}:${uid(12)}`;
}

async function persistDecision(
  ctx: ModerationContext,
  decision: ModerationDecision,
  reason: string | null,
  externalId: string,
  creemId: string | null,
  units: number | null,
  latencyMs: number,
): Promise<void> {
  try {
    await getDb()
      .insert(moderationLog)
      .values({
        userId: ctx.userId === "guest" ? GUEST_USER_ID : ctx.userId,
        convId: ctx.convId ?? null,
        model: ctx.model,
        mediaType: ctx.mediaType,
        decision,
        reason,
        prompt: ctx.prompt,
        externalId,
        creemId,
        units,
        latencyMs,
      });
  } catch (err) {
    logger.error("Failed to persist moderation decision", {
      context: "moderation.persist",
      error: err instanceof Error ? err.message : String(err),
      decision,
      externalId,
    });
  }
}

async function checkPromptModeration(
  ctx: ModerationContext,
): Promise<ModerationResult> {
  if (!serverEnv.creemModerationEnabled) {
    return { allowed: true, id: "disabled", units: 0, latencyMs: 0 };
  }

  const externalId = buildExternalId(ctx.userId, ctx.convId);
  const start = Date.now();

  const apiKey = serverEnv.creemApiKey;
  const apiUrl = serverEnv.creemApiUrl;
  if (!apiKey || !apiUrl) {
    const latencyMs = Date.now() - start;
    logger.error("Moderation skipped: Creem env missing", {
      context: "moderation",
      externalId,
      userId: ctx.userId,
      convId: ctx.convId,
      model: ctx.model,
      mediaType: ctx.mediaType,
      missing: !apiKey ? "CREEM_API_KEY" : "CREEM_API_URL",
    });
    await persistDecision(
      ctx,
      "error",
      !apiKey ? "missing_api_key" : "missing_api_url",
      externalId,
      null,
      null,
      latencyMs,
    );
    return { allowed: false, reason: "error", latencyMs };
  }

  let creemJson: CreemResponse | null = null;
  let errorReason: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/v1/moderation/prompt`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: ctx.prompt,
        external_id: externalId,
      }),
      signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    });

    if (!res.ok) {
      errorReason = `http_${res.status}`;
    } else {
      creemJson = (await res.json()) as CreemResponse;

      if (
        !creemJson ||
        typeof creemJson.decision !== "string" ||
        !["allow", "flag", "deny"].includes(creemJson.decision)
      ) {
        errorReason = "invalid_response_shape";
        creemJson = null;
      }
    }
  } catch (err) {
    errorReason =
      err instanceof Error && err.name === "TimeoutError"
        ? "timeout"
        : err instanceof Error
          ? err.message.slice(0, 120)
          : "unknown_error";
  }

  const latencyMs = Date.now() - start;

  if (!creemJson || errorReason) {
    logger.error("Moderation call failed, failing closed", {
      context: "moderation",
      externalId,
      userId: ctx.userId,
      convId: ctx.convId,
      model: ctx.model,
      mediaType: ctx.mediaType,
      error: errorReason,
      latencyMs,
    });
    await persistDecision(
      ctx,
      "error",
      errorReason,
      externalId,
      null,
      null,
      latencyMs,
    );
    return { allowed: false, reason: "error", latencyMs };
  }

  const decision = creemJson.decision as "allow" | "flag" | "deny";
  const units = creemJson.usage?.units ?? null;
  const creemId = creemJson.id ?? null;

  const logFields = {
    context: "moderation",
    decision,
    externalId,
    userId: ctx.userId,
    convId: ctx.convId,
    model: ctx.model,
    mediaType: ctx.mediaType,
    units,
    latencyMs,
    creemId,
  };

  if (decision === "allow") {
    logger.info("Moderation allow", logFields);
    await persistDecision(
      ctx,
      "allow",
      null,
      externalId,
      creemId,
      units,
      latencyMs,
    );
    return {
      allowed: true,
      id: creemId ?? externalId,
      units: units ?? 0,
      latencyMs,
    };
  }

  logger.warn(`Moderation ${decision}`, logFields);
  await persistDecision(
    ctx,
    decision,
    null,
    externalId,
    creemId,
    units,
    latencyMs,
  );
  return {
    allowed: false,
    reason: decision,
    id: creemId ?? externalId,
    latencyMs,
  };
}

export async function assertPromptAllowed(
  ctx: ModerationContext,
): Promise<void> {
  const result = await checkPromptModeration(ctx);
  if (result.allowed) return;

  if (result.reason === "deny") {
    throw new Error(msg("ERRORS.PROMPT_REJECTED"));
  }
  if (result.reason === "flag") {
    throw new Error(msg("ERRORS.PROMPT_FLAGGED"));
  }
  throw new Error(msg("ERRORS.MODERATION_UNAVAILABLE"));
}
