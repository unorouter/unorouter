"use client";

import { fnv1aHex } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  chatDefaultsAtom,
  chatGroupAtom,
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  globalVarsAtom,
  localUserIdAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";
import { DefaultChatTransport } from "ai";
import { useRef } from "react";

// Per-conv dedup: sent = last uploaded hash, built = last full context (replayed on 409). Bounded LRU.
const MAX_CTX_CONVS = 50;
const ctxState = new Map<string, { sent?: string; built: ContextEntry }>();
type ContextEntry = { hash: string; ctx: unknown };

function ctxFor(convId: string) {
  const hit = ctxState.get(convId);
  if (hit) {
    ctxState.delete(convId);
    ctxState.set(convId, hit);
  }
  return hit;
}

function setCtx(convId: string, entry: { sent?: string; built: ContextEntry }) {
  ctxState.delete(convId);
  ctxState.set(convId, entry);
  if (ctxState.size > MAX_CTX_CONVS) {
    const oldest = ctxState.keys().next().value;
    if (oldest !== undefined) ctxState.delete(oldest);
  }
}

// settings carries the whole conversation row; drop server-unread bookkeeping before hashing so the dedup hits.
const SETTINGS_HASH_OMIT = [
  "totalInputTokens",
  "totalOutputTokens",
  "totalCost",
  "updatedAt",
  "createdAt",
] as const;

function hashableContext(ctx: unknown): string {
  const c = ctx as { settings?: Record<string, unknown> };
  if (!c?.settings) return JSON.stringify(ctx);
  const settings = { ...c.settings };
  for (const k of SETTINGS_HASH_OMIT) delete settings[k];
  return JSON.stringify({ ...c, settings });
}

// getConvId stays thread-scoped via a ref: an async body() must not build the last-active conv's context.
export function useChatTransport(getConvId: () => string | null) {
  const getConvIdRef = useRef(getConvId);
  getConvIdRef.current = getConvId;
  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/ai/chat/stream",
      body: async () => {
        const userId = chatStore.get(localUserIdAtom);
        const convId = getConvIdRef.current();
        // Dynamic: the RP context builder drags ~110KB lorebook/trigger machinery off first-paint chunks.
        const loadout = chatStore.get(chatLoadoutAtom);
        const baseContext = convId
          ? await import("@/lib/db/client/data/chat-context").then((m) =>
              m.buildChatContextFromLocalDb(userId, convId, {
                // New conv first send races initialize(); wait for the loadout bindings so turn 1 carries the character.
                expectBindings:
                  loadout.characterIds.length > 0 ||
                  loadout.lorebookIds.length > 0,
              }),
            )
          : undefined;
        // Per-message createdAt for the CBS message_time/idle family; rides outside the hashed context.
        let messageTimes: Record<string, number> | undefined;
        if (convId) {
          const rows = await import("@/lib/db/client/data/chat").then((m) =>
            m.readLocalMessages(userId, convId),
          );
          if (rows && rows.length > 0) {
            messageTimes = {};
            for (const r of rows) {
              messageTimes[r.id] = new Date(r.createdAt).getTime();
            }
          }
        }
        // Context-dedup: full payload only when the fingerprint changed, else just the hash (a miss 409s, retries full).
        let chatContext: typeof baseContext;
        let chatContextHash: string | undefined;
        if (convId && baseContext) {
          chatContextHash = fnv1aHex(hashableContext(baseContext));
          const prevSent = ctxFor(convId)?.sent;
          const changed = prevSent !== chatContextHash;
          if (changed) chatContext = baseContext;
          setCtx(convId, {
            sent: changed ? chatContextHash : prevSent,
            built: { hash: chatContextHash, ctx: baseContext },
          });
        } else {
          chatContext = baseContext;
        }
        logChatDebug("transport.body", {
          resolvedConvId: convId,
          convIdAtom: chatStore.get(convIdAtom),
          chatContextHash,
          sentFullContext: chatContext !== undefined,
          messageTimesCount: messageTimes
            ? Object.keys(messageTimes).length
            : 0,
        });
        return {
          model: chatStore.get(chatModelAtom),
          convId,
          webSearch: chatStore.get(chatWebSearchAtom),
          // null == auto; server omits the X-Group header for null/auto.
          group: chatStore.get(chatGroupAtom),
          overrides: chatStore.get(chatDefaultsAtom),
          chatContext,
          chatContextHash,
          globalVars: chatStore.get(globalVarsAtom),
          // Speaking character for this stream (multi-character rotation).
          speakingCharacterId: chatStore.get(speakingCharacterIdAtom),
          messageTimes,
          clientEnv: {
            viewportW: window.innerWidth,
            viewportH: window.innerHeight,
            locale: Intl.DateTimeFormat().resolvedOptions().locale,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };
      },
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const res = await fetch(input, init);
        if (res.status !== 409 || typeof init?.body !== "string") return res;
        const payload = await res
          .clone()
          .json()
          .catch(() => null);
        if (payload?.code !== "context-required") return res;
        // Server lost the cached context: retry once with the full payload.
        const body = JSON.parse(init.body) as Record<string, unknown> & {
          convId?: string | null;
        };
        const entry = body.convId ? ctxFor(body.convId) : undefined;
        if (!entry) return res;
        body.chatContext = entry.built.ctx;
        body.chatContextHash = entry.built.hash;
        // Server lost its cache; the full payload reseeds it. Keep sent marked so the next send still dedups.
        return fetch(input, { ...init, body: JSON.stringify(body) });
      },
      // Memory off: server consumes a window, trim to a superset. Rolling-summary convs need absolute indices.
      prepareSendMessagesRequest: (opts) => {
        const body = (opts.body ?? {}) as Record<string, unknown> & {
          chatContext?: {
            settings?: {
              memoryEnabled?: boolean | null;
              summaryAnchor?: number | null;
              chatMemory?: number | null;
            };
            lorebooks?: Array<{ lorebook?: { scanDepth?: number | null } }>;
          };
        };
        const settings = body.chatContext?.settings;
        const memoryOn =
          settings?.memoryEnabled === true ||
          (settings?.summaryAnchor ?? 0) > 0;
        let messages = opts.messages;
        if (!memoryOn && messages.length > 64) {
          const maxScan = Math.max(
            4,
            ...(body.chatContext?.lorebooks ?? []).map(
              (l) => l.lorebook?.scanDepth ?? 4,
            ),
          );
          const keep = Math.max(
            64,
            (settings?.chatMemory ?? 8) * 2,
            maxScan * 2,
          );
          if (messages.length > keep) messages = messages.slice(-keep);
        }
        return {
          body: {
            ...body,
            id: opts.id,
            messages,
            trigger: opts.trigger,
            messageId: opts.messageId,
          },
        };
      },
    }),
  );
  // Built once in a ref; the body callback reads live state from the store, so returning current at render is safe.
  // eslint-disable-next-line react-hooks/refs -- stable transport built once
  return transportRef.current;
}
