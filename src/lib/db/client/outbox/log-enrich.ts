"use client";

import {
  bumpLocalConversationTotals,
  messageStore,
  updateLocalMessage,
} from "@/lib/db/client/data/chat/chat";
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

const sumOf = (values: Array<number | null | undefined>) =>
  values.every((v) => v == null)
    ? undefined
    : values.reduce<number>((n, v) => n + (v ?? 0), 0);

export async function enrichRequestLogFromUpstream(
  msgId: string,
  requestIds: string[],
): Promise<void> {
  const rows = [];
  for (const requestId of requestIds) {
    const res = handleElysia(
      await rpc.api.ops.logs["by-request"].get({
        query: { request_id: requestId },
      }),
    );
    if (res.quota == null && res.channel == null) {
      logChatDebug("enrich.not_yet_logged", { msgId, requestId });
      throw new Error("upstream log not ready");
    }
    rows.push(res);
  }
  const channels = [...new Set(rows.flatMap((r) => r.channel ?? []))];
  logChatDebug("enrich.patched", {
    msgId,
    steps: rows.length,
    channel: channels.join(", ") || null,
  });
  const before = await readLocalRequestLog(msgId);
  const quota = sumOf(rows.map((r) => r.quota));
  const patch = {
    cost: quota != null ? quotaToDollars(quota) : undefined,
    inputTokens: sumOf(rows.map((r) => r.promptTokens)),
    outputTokens: sumOf(rows.map((r) => r.completionTokens)),
  };
  await patchLocalRequestLogUpstream(msgId, {
    ...patch,
    durationMs: sumOf(rows.map((r) => r.useTime)),
    channelName: channels.length > 0 ? channels.join(", ") : undefined,
  });
  const keys: QueryKey[] = [queryKeys.requestLog(msgId)];
  // The conversation totals were bumped with whatever the stream reported,
  // which is nothing for a lane that never sends usage. Move them by the
  // difference so the chat total reflects the gateway's numbers.
  if (before) {
    keys.push(queryKeys.requestLogList(before.convId));
    const delta = {
      inputTokens: (patch.inputTokens ?? 0) - (before.inputTokens ?? 0),
      outputTokens: (patch.outputTokens ?? 0) - (before.outputTokens ?? 0),
      cost: (patch.cost ?? 0) - (before.cost ?? 0),
    };
    if (delta.inputTokens || delta.outputTokens || delta.cost) {
      await bumpLocalConversationTotals(before.convId, delta);
      keys.push(queryKeys.chatMeta(before.convId), queryKeys.conversations());
      // The message footer reads the message row, which holds the catalog
      // estimate; a continued message already carries earlier turns' totals.
      const message = await messageStore.get(msgId);
      if (message) {
        await updateLocalMessage(msgId, {
          inputTokens: (message.inputTokens ?? 0) + delta.inputTokens || null,
          outputTokens:
            (message.outputTokens ?? 0) + delta.outputTokens || null,
          cost: (message.cost ?? 0) + delta.cost || null,
        });
        keys.push(queryKeys.chatMessages(before.convId));
      }
    }
  }
  invalidateAndBroadcast(getQueryClient(), keys);
}
