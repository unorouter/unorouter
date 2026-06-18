import { getLocalDb } from "@/lib/db/client/client";
import {
  readLocalConversations,
  readLocalMessages,
} from "@/lib/db/client/data/chat";
import { readLocalRequestLogsForConv } from "@/lib/db/client/data/request-log";
import { getChatDebugLog } from "@/lib/utils/chat-debug-log";
import { chatStore, convIdAtom, historyLoadedAtom } from "@/store/chat-store";
import { dayjs } from "@/lib/utils/format/date";

// One-file chat diagnostics for users to download + send (e.g. via Discord) when a chat issue
// can't be reproduced on our devices (iOS-only bugs). Safe mode = metadata only (no message text);
// full mode adds content. The ring buffer is only populated if the user enabled debug logging.

type DiagnosticsOptions = { includeContent: boolean };

const MAX_LOG_CONVS = 25;

export async function buildDiagnostics(
  userId: number | undefined,
  opts: DiagnosticsOptions,
): Promise<Record<string, unknown>> {
  const includeContent = opts.includeContent;

  const device = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    language: navigator.language,
    // iOS heuristic: classic iOS UA, or iPadOS masquerading as Mac with touch.
    likelyIos:
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    screen: { w: window.screen.width, h: window.screen.height },
    online: navigator.onLine,
  };

  const runtime = {
    url: location.href,
    convIdAtom: chatStore.get(convIdAtom),
    historyLoaded: chatStore.get(historyLoadedAtom),
  };

  let dbInfo: Record<string, unknown> = {};
  try {
    const local = await getLocalDb(userId);
    if (local) dbInfo = await local.getDatabaseInfo();
  } catch (e) {
    dbInfo = { error: String(e).slice(0, 200) };
  }
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) dbInfo.storageEstimate = { usage: est.usage, quota: est.quota };
  } catch {
    // ignore
  }

  const convs = (await readLocalConversations(userId)) ?? [];
  const conversations = convs.map((c) => ({
    id: c.id,
    title: includeContent ? c.title : undefined,
    model: c.model,
    groupId: c.groupId,
    totalInputTokens: c.totalInputTokens,
    totalOutputTokens: c.totalOutputTokens,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  // Per-conv message metadata: parentId/convId cross-links reveal a merge without exposing text.
  const messagesByConv: Record<string, unknown[]> = {};
  const requestLogsByConv: Record<string, unknown[]> = {};
  for (const c of convs) {
    const rows = (await readLocalMessages(userId, c.id)) ?? [];
    messagesByConv[c.id] = rows.map((m) => ({
      id: m.id,
      convId: m.convId,
      parentId: m.parentId,
      role: m.role,
      model: m.model,
      branchIndex: m.branchIndex,
      isActiveBranch: m.isActiveBranch,
      createdAt: m.createdAt,
    }));

    const logs = await readLocalRequestLogsForConv(userId, c.id);
    requestLogsByConv[c.id] = logs.slice(-MAX_LOG_CONVS).map((l) => ({
      msgId: l.msgId,
      convId: l.convId,
      requestId: l.requestId,
      channelName: l.channelName,
      inputTokens: l.inputTokens,
      createdAt: l.createdAt,
      // Full mode: the actual sent payload shows if a request carried the wrong conv's context.
      finalMessages: includeContent ? l.finalMessages : undefined,
      requestBody: includeContent ? l.requestBody : undefined,
    }));
  }

  return {
    schema: "unorouter-diagnostics-1",
    generatedAt: dayjs().toISOString(),
    includeContent,
    device,
    runtime,
    dbInfo,
    conversations,
    messagesByConv,
    requestLogsByConv,
    debugLog: getChatDebugLog(),
  };
}
