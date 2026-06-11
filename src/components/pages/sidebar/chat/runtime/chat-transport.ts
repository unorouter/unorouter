"use client";
/* eslint-disable react-hooks/refs -- transport built once in a ref;
   userIdRef carries the live user into the async body callbacks. */

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { fnv1aHex } from "@/lib/utils/base";
import {
  chatDefaultsAtom,
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  globalVarsAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";
import { DefaultChatTransport } from "ai";
import { useRef } from "react";

// Context-dedup handshake state per conv: `sent` is the hash last uploaded
// (skip re-upload when unchanged); `built` is the last full context (the 409
// retry replays it). Bounded LRU so a long session over many convs can't grow
// it without limit; eviction only forces a one-off full re-upload.
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

// settings carries the whole conversation row, including per-turn bookkeeping
// the server never reads for prompt assembly (totals, the row updatedAt). Drop
// those before hashing so the dedup actually hits on consecutive turns instead
// of re-uploading the full context every message.
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
        const loadout = chatStore.get(chatLoadoutAtom);
        const baseContext = convId
          ? await import("@/lib/db/client/data/chat-context").then((m) =>
              m.buildChatContextFromLocalDb(userIdRef.current, convId, {
                // New conv first send: initialize() races this; wait for the
                // loadout's bindings so turn 1 carries the character.
                expectBindings:
                  loadout.characterIds.length > 0 ||
                  loadout.lorebookIds.length > 0,
              }),
            )
          : undefined;
        // Per-message createdAt for the CBS message_time/idle family; rides
        // outside the hashed context (changes every turn).
        let messageTimes: Record<string, number> | undefined;
        if (convId) {
          const rows = await import("@/lib/db/client/data/chat").then((m) =>
            m.readLocalMessages(userIdRef.current, convId),
          );
          if (rows && rows.length > 0) {
            messageTimes = {};
            for (const r of rows) {
              messageTimes[r.id] = new Date(r.createdAt).getTime();
            }
          }
        }
        // Context-dedup handshake: full payload only when the fingerprint changed,
        // else just the hash (server LRU; a miss 409s and the fetch wrapper retries
        // full). globalVars ride outside the hash: they change every setglobalvar.
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
        // Server lost its cache; the full payload now reseeds it. Keep `sent`
        // marked so the next send still dedups (this request reseeded it).
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
