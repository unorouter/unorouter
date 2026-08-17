"use client";

import { patchLocalRequestLogUpstream } from "@/lib/db/client/data/chat/request-log";
import getQueryClient from "@/lib/react-query/client";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { quotaToDollars } from "@/lib/utils/format/number";

export async function enrichRequestLogFromUpstream(
  msgId: string,
  requestId: string,
): Promise<void> {
  const res = handleElysia(
    await rpc.api.ops.logs["by-request"].get({
      query: { request_id: requestId },
    }),
  );
  if (res.quota == null && res.channel == null) {
    logChatDebug("enrich.not_yet_logged", { msgId });
    throw new Error("upstream log not ready");
  }
  logChatDebug("enrich.patched", { msgId, channel: res.channel ?? null });
  await patchLocalRequestLogUpstream(msgId, {
    cost: res.quota != null ? quotaToDollars(res.quota) : undefined,
    inputTokens: res.promptTokens ?? undefined,
    outputTokens: res.completionTokens ?? undefined,
    durationMs: res.useTime ?? undefined,
    channelName: res.channel ?? undefined,
  });
  invalidateAndBroadcast(getQueryClient(), [queryKeys.requestLog(msgId)]);
}
