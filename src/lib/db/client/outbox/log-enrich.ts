"use client";

import { bumpLocalConversationTotals } from "@/lib/db/client/data/chat/chat";
import {
  patchLocalRequestLogUpstream,
  readLocalRequestLog,
} from "@/lib/db/client/data/chat/request-log";
import getQueryClient from "@/lib/react-query/client";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { QueryKey } from "@tanstack/react-query";
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
  const before = await readLocalRequestLog(msgId);
  const patch = {
    cost: res.quota != null ? quotaToDollars(res.quota) : undefined,
    inputTokens: res.promptTokens ?? undefined,
    outputTokens: res.completionTokens ?? undefined,
  };
  await patchLocalRequestLogUpstream(msgId, {
    ...patch,
    durationMs: res.useTime ?? undefined,
    channelName: res.channel ?? undefined,
  });
  const keys: QueryKey[] = [queryKeys.requestLog(msgId)];
  // The conversation totals were bumped with whatever the stream reported,
  // which is nothing for a lane that never sends usage. Move them by the
  // difference so the chat total reflects the gateway's numbers.
  if (before) {
    const delta = {
      inputTokens: (patch.inputTokens ?? 0) - (before.inputTokens ?? 0),
      outputTokens: (patch.outputTokens ?? 0) - (before.outputTokens ?? 0),
      cost: (patch.cost ?? 0) - (before.cost ?? 0),
    };
    if (delta.inputTokens || delta.outputTokens || delta.cost) {
      await bumpLocalConversationTotals(before.convId, delta);
      keys.push(queryKeys.chatMeta(before.convId), queryKeys.conversations());
    }
  }
  invalidateAndBroadcast(getQueryClient(), keys);
}
