import { QUOTA_PER_DOLLAR } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { getUserLogs } from "@/openapi";
import { deriveUpstream, getProvider } from "@/server/constants";
import { convertToModelMessages, streamText } from "ai";
import { eq, sql } from "drizzle-orm";
import { pendingUsageByConv } from "./message.service";

export async function streamChat(
  apiKey: string,
  body: {
    model: string;
    messages: Parameters<typeof convertToModelMessages>[0];
    convId?: string | null;
  },
  request: Request,
) {
  const provider = getProvider(apiKey);
  const { upstream } = deriveUpstream({ request });

  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(body.messages),
    onFinish: async ({ usage, response }) => {
      if (!body.convId) return;
      const reqId = response.headers?.["x-oneapi-request-id"] ?? undefined;
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;

      // Query new-api logs for exact cost
      let cost = 0;
      if (reqId) {
        try {
          const logRes = await getUserLogs(
            { request_id: reqId, type: 2, page_size: 1 },
            { headers: upstream.headers },
          );
          const quota = logRes.data!.data?.items?.[0]?.quota ?? 0;
          cost = quota / QUOTA_PER_DOLLAR;
        } catch {
          // Log lookup failed, store tokens without cost
        }
      }

      // Buffer usage data for the persist endpoint to apply
      pendingUsageByConv.set(body.convId, {
        requestId: reqId,
        inputTokens,
        outputTokens,
        cost,
      });

      // Increment conversation totals immediately
      const db = getDb();
      await db
        .update(conversations)
        .set({
          totalInputTokens: sql`${conversations.totalInputTokens} + ${inputTokens}`,
          totalOutputTokens: sql`${conversations.totalOutputTokens} + ${outputTokens}`,
          totalCost: sql`${conversations.totalCost} + ${cost}`,
        })
        .where(eq(conversations.id, body.convId));
    },
  });

  return result.toUIMessageStreamResponse();
}
