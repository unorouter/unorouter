"use client";
/* eslint-disable react-hooks/refs -- transport built once in a ref;
   userIdRef carries the live user into the async body callbacks. */

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { fnv1aHex } from "@/lib/utils/base";
import {
  chatDefaultsAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  globalVarsAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";
import { DefaultChatTransport } from "ai";
import { useRef } from "react";

// Context-dedup handshake state: hash last SENT per conv (skip re-upload) and
// the last BUILT context per conv (the 409 retry needs the full payload).
const sentContextHashes = new Map<string, string>();
const lastContextRef = {
  current: new Map<string, { hash: string; ctx: unknown }>(),
};

// Built once; userIdRef refreshed each render for live user in async body.
export function useChatTransport() {
  const auth = useAuthQuery();
  const userIdRef = useRef(auth.data?.id);
  userIdRef.current = auth.data?.id;

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/ai/chat/stream",
      body: async () => {
        const convId = chatStore.get(convIdAtom);
        // Dynamic: the RP context builder drags lorebook/trigger machinery
        // (~110KB gzip) that must not sit in the page's first-paint chunks.
        const baseContext = convId
          ? await import("@/lib/db/client/data/chat-context").then((m) =>
              m.buildChatContextFromLocalDb(userIdRef.current, convId),
            )
          : undefined;
        // Context-dedup handshake: full payload only when the fingerprint changed,
        // else just the hash (server LRU; a miss 409s and the fetch wrapper retries
        // full). globalVars ride outside the hash: they change every setglobalvar.
        let chatContext: typeof baseContext;
        let chatContextHash: string | undefined;
        if (convId && baseContext) {
          chatContextHash = fnv1aHex(JSON.stringify(baseContext));
          lastContextRef.current.set(convId, {
            hash: chatContextHash,
            ctx: baseContext,
          });
          if (sentContextHashes.get(convId) !== chatContextHash) {
            chatContext = baseContext;
            sentContextHashes.set(convId, chatContextHash);
          }
        } else {
          chatContext = baseContext;
        }
        return {
          model: chatStore.get(chatModelAtom),
          convId,
          webSearch: chatStore.get(chatWebSearchAtom),
          // Guest fallback.
          overrides: chatStore.get(chatDefaultsAtom),
          chatContext,
          chatContextHash,
          globalVars: chatStore.get(globalVarsAtom),
          // Speaking character for this stream (multi-character rotation).
          speakingCharacterId: chatStore.get(speakingCharacterIdAtom),
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
        const last = body.convId
          ? lastContextRef.current.get(body.convId)
          : undefined;
        if (!last) return res;
        body.chatContext = last.ctx;
        body.chatContextHash = last.hash;
        return fetch(input, { ...init, body: JSON.stringify(body) });
      },
      // With memory off the server only consumes a window; trim to a generous
      // superset of all consumers. Rolling-summary convs need absolute indices, send full.
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
  return transportRef.current;
}
