"use client";

import { patchLocalRequestLogUpstream } from "@/lib/db/client/data/request-log";
import getQueryClient from "@/lib/react-query/client";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { quotaToDollars } from "@/lib/utils/format/number";

    // Pull new-api's authoritative record for a finished request, overwriting local request_logs estimates. Missing result throws.
export async function enrichRequestLogFromUpstream(
  userId: number,
  msgId: string,
  requestId: string,
): Promise<void> {
  const res = handleElysia(
    await rpc.api.ops.logs["by-request"].get({
      query: { request_id: requestId },
    }),
  );
  // Upstream hasn't logged the row yet: throw so the backoff retries.
  if (res.quota == null && res.channel == null) {
    throw new Error("upstream log not ready");
  }
  await patchLocalRequestLogUpstream(userId, msgId, {
    cost: res.quota != null ? quotaToDollars(res.quota) : undefined,
    inputTokens: res.promptTokens ?? undefined,
    outputTokens: res.completionTokens ?? undefined,
    durationMs: res.useTime ?? undefined,
    channelName: res.channel ?? undefined,
  });
  // Invalidate locally (an open sheet in this tab) AND across tabs.
  invalidateAndBroadcast(getQueryClient(), [queryKeys.requestLog(msgId)]);
}
