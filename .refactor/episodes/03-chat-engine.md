# Episode 03: Chat engine + runtime (post-isomorphic-rewrite leftovers)

## Intent

Isomorphic chat engine: browser assembles + streams for both text paths (catalog via /forward proxy, custom BYOK direct). Server thin: media, title, trigger-ops, forward proxy. assistant-ui runtime bridges to local-first storage.

## Timeline (4 rewrites)

- Mar 30 - Apr 9: chat v1, server-backed conversations, R2 media, first runtime adapter.
- Apr 4: adapter rewrite ("remove deprecated chat components and implement new chat runtime and thread list adapter"); old DB schema removed twice in one day.
- May 12: chat history + runtime providers v2.
- Jun 10-12: prepareChatRequest extraction, chat context caching WITH fingerprint dedup added (dafd0dfd) - later REMOVED entirely (CLAUDE.md: "no FNV-1a dedup handshake, no 409 retry anymore").
- Jun 12: "Refactor chat streaming and preparation services; introduce title generation and trigger operations" = pipeline stage split.
- Jun 24 - Jul 5: custom providers, per-model tokenizers, image refs, illustrator agent.
- Jul 8-10: branch-collapse fix on regen siblings, deleted-message thread fix, max-tokens sticky fix.

## Debt markers

- Four generations of runtime code; each rewrite claimed the previous adapter. Highest-churn directory in the repo (runtime/, pipeline/).
- Removed subsystems leave shadows: context-cache/dedup gone, Turso mirror gone, but stream body/types may still carry fields only those consumed.
- Fix cluster Jul 8-10 around branch/sibling handling (d2bb7ca1 regen siblings collapsed thread, 9f0aaefe splice-delete self-heal, 07d6d0fb deleted message refresh) = message-chain invariants live in several places (history adapter, chat-hook, queued-send detection).
- ORDER-LOCKED role transforms + 3 copy-paste custom/catalog branches were consolidated into resolveModelTarget; verify no stragglers (illustrator was custom-blind once already).

## File set

- src/lib/ai/chat/ (pipeline/, prompt/, context/, triggers/, runtime engines)
- src/components/pages/sidebar/chat/runtime/ (provider, transports, adapters)
- src/server/ai/chat/ (route, forward, media, title, trigger-ops)
- src/hooks/ai/chat-hook.ts, queued-send.ts

## Cleanup scope

1. Grep StreamBody/PreparedChatRequest/finish-meta for fields with zero live readers (mirror-era, context-cache-era).
2. Centralize message-chain invariants (active branch, sibling, splice rules) into one module; the Jul fixes patched three sites.
3. Verify resolveModelTarget is the only custom/catalog branch left.

## Non-goals

- No fifth rewrite. No touching src/components/ui/ primitives (CLAUDE.md rule). Engine order-locked transforms stay locked.
