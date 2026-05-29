# Chat Architecture

Reference for the chat vertical in `unorouter`. Companion to the root [CLAUDE.md](../CLAUDE.md); this doc goes deeper on data flow, the storage model, and the invariants that hold the system together.

## 1. Mental model

Local-first AI chat with SillyTavern-grade roleplay. Three truths:

1. The per-user SQLocal/OPFS database in the browser is the source of truth for all chat, RP, and playground state.
2. Turso (server DB) is an optional mirror. A row syncs only when its `syncExpiresAt` is non-null. The server purges synced rows past that timestamp.
3. The server `/chat/stream` endpoint owns the only real business logic: prompt assembly, augmentation, and the upstream model call. It persists nothing about the conversation; the client writes the result back to SQLocal.

```
Browser
  UI (assistant-ui Thread + RP dialogs/pages)
   |
  Runtime adapters (history / thread-list / transport / attachment)
   |
  State: Jotai chatStore (convIdAtom bridge) + React Query (caches SQLocal reads)
   |
  SQLocal / OPFS  <-- SOURCE OF TRUTH (per-user file)
   |  mirror when syncExpiresAt != null
   v
Server (Elysia BFF)
  /ai/chat/stream  -> augmentation pipeline -> ai SDK streamText
  /ai/sync/*       -> Turso mirror + R2 media
   |
   v
Upstream new-api -> AI models
```

Everything below explains how those layers connect.

## 2. Server surface

### 2.1 Route mounting

`src/app/api/[[...route]]/route.ts` is the Elysia BFF root (`/api`). Mount order: openapi plugin, then `webBotAuthPlugin`, then 5 domain routes. `src/server/ai/route.ts` mounts `/ai` with chat, playground, and sync subroutes.

### 2.2 Chat endpoints

`src/server/ai/chat/route.ts` exposes **6 endpoints only**. There is no POST/PATCH/DELETE for conversations or messages: those are client hooks writing SQLocal.

| Endpoint | Method | Auth | Body schema |
| --- | --- | --- | --- |
| `/:id/meta` | GET | `getUserId` (required) | - |
| `/:id/markdown` | GET | `getUserId` (required) | - |
| `/title` | POST | `getApiKeyOrGuest` | `titleGenerationBody` |
| `/stream` | POST | `getApiKeyOrGuest` + optional `getUserId` | `streamBody` |
| `/task/:taskId` | GET | `getApiKey` (required, no guest) | - |
| `/:id/task/finalize` | POST | `getUserId` (required) | `finalizeTaskBody` |

Guest detection: `userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID`. Guests get `body.webSearch = false` forced at `route.ts:49`.

### 2.3 Auth derivation

`src/server/constants.ts`:

- `user-id` cookie: signed via iron-session (`signUserId`/`verifyUserId`, needs `SESSION_SECRET` >= 32 chars). `getUserId(cookie)` throws if missing unless `optional=true`.
- `client-store` cookie (JSON, owned by `src/store/client-store.ts`): holds the user's API key. `getApiKey(cookie)` extracts it.
- `getApiKeyOrGuest(cookie)`: user key, else `serverEnv.guestApiKey`.
- `access_token` cookie (httpOnly): upstream API token, forwarded by `deriveUpstream`.

Guest = `userId === GUEST_USER_ID` (0). Guests never touch Turso/R2 and lose web search + paid + comfyui models.

## 3. The stream request lifecycle

`POST /ai/chat/stream` -> `streamChat(apiKey, body, request, userId)` in `src/server/ai/chat/stream.service.ts`.

```
1. Detect model type via isMediaModel(body.model)
     image  -> handleImageStream      (sync gen, inline data URL, buffered)
     video  -> handleVideoTaskStream  (async task, returns data-task part)
     text   -> continue below
     (media text models -> handleBufferedStream: buffer, rehost URLs to R2)

2. Load conversation context
     client chatContext (client ships its local DB state) preferred -> zero Turso reads
     else Turso loadConvContext(convId) (fallback when the request omits chatContext)

3. Web search (gated: toolbar OR conv setting; guests off)
     needsWebSearch() free-model-race classifier (3-token, fail-closed)
     -> searchTavily() (5s abort, max 5 results)
     -> formatSearchContext() into a system message

4. PDF inline (transforms.inlinePdfText)
     PDF file parts pointing at R2 -> media.extractedText replaces them
     missing extraction throws PDF_EXTRACTION_FAILED

5. Prompt assembly (assembleForStream | assembleFromOverrides)
     builds the system prompt + sampling + flags + depth injections

6. LOCKED transform order (stream.service.ts:159) - see section 5

7. streamText() with provider model, converted messages, system, sampling
     maxRetries: 0 (surface upstream errors verbatim)
     free models capped at FREE_MODEL_OUTPUT_CAP = 8192 output tokens

8. Response
     text  -> toUIMessageStreamResponse({ messageMetadata })
     media -> handleBufferedStream (rehost URLs, single buffered chunk)
     usage rides the finish part via messageMetadata({ part })

9. Telemetry: chat_stream_started / completed / failed, chat_web_search_executed
```

The client's history adapter reads `message.metadata.usage` from step 8 and bumps `conversations` totals when it persists.

## 4. Augmentation pipeline

`src/server/ai/chat/augmentation/`. Composed by the stream service in this dependency order:

1. **Web search** (`tavily.service.ts`): free-model-race classifier gate, then Tavily. Fail-closed. Guests off (paid-only).
2. **PDF inline** (`stream/transforms.ts`): R2-hosted PDF parts -> `media.extractedText`.
3. **Lorebook selection** (`prompt-assembler/lorebook.ts`): per-book keyword match over recent user texts within `scanDepth`; token budget via gpt-tokenizer; recursive passes capped at `MAX_RECURSIVE_LOREBOOK_PASSES = 3` when `recursiveScanning`. Whole-word matching via word-boundary regex.
4. **Prompt assembly** (`prompt-assembler.service.ts`): section order is

   ```
   main_prompt
     -> system_fallback (web search block)
     -> lorebook top entries
     -> lorebook before_char entries
     -> per-character blocks (primary drives {{char}}; non-primary trigger-gated)
     -> persona
     -> lorebook after_char entries
     -> systemPromptOverride || primary.systemPrompt
     -> primary.postHistoryInstructions
     -> preset.postHistory
     -> lorebook bottom entries
   ```

   `at_depth` lorebook entries return as `DepthInjection[]` spliced into messages later. Sampling merge: preset, then settings, then sliders + reasoning win in providerOptions. `extraBody` from settings beats preset on key clash.
5. **Moderation** (`moderation.service.ts`): Creem gate, `MODERATION_TIMEOUT_MS = 5s`, env-gated. **Image/video only** (text chat bypasses). Every decision (`allow|flag|deny|error`) persisted to the server-only `moderation_log`. Fail-closed.
6. **Title** (`title.service.ts`): stateless, races `FREE_MODEL_RACE_COUNT = 5` free models via `Promise.any`, 30-token output, truncates to ~60 chars on failure. Client persists.
7. **Task** (`task.service.ts`): async video submit/poll; `finalizeVideoTask` rewrites the persisted `task` item to a `text` item with `![video](r2url)`.

## 5. The locked transform order

`stream/transforms.ts`, applied in the order at `stream.service.ts:159`. The order is load-bearing.

1. `noSystemRole` (strip system -> user with `[System]:` prefix) BEFORE merge, so the stripped message is eligible to collapse. For Gemini/GLM mid-conv.
2. `appendPrefill` BEFORE merge, so a trailing assistant prefill can collapse with an existing trailing assistant. `skipPrefillIfLastIsAssistant + forceAlternateRoles` opts out.
3. `mergeAlternateRoles` AFTER prefill, enforcing strict user/assistant alternation for GLM/Anthropic.
4. `prependUserStub` LAST (`[Start a new chat]`), so merge cannot fold the stub.

Plus pure transforms: `spliceDepthInjections` (lorebook `at_depth` + author note), `expandMessageMacros` ({{user}}, {{char}}, ...), `geminiBlockOff` (all five Gemini safety categories to `OFF`).

If you reorder these, role alternation breaks for strict providers. Do not.

## 6. Message shape conversion

`src/lib/ai/chat/messages.ts` is the bidirectional bridge between ai-sdk message parts and DB rows.

- `partsToItems(parts)`: ai-sdk parts -> `message_items` rows. `tool-invocation` (state-based: call vs result) -> `tool_call`/`tool_result`. `data-task` -> `task`. `file`/`source-url` -> `file`/`image`. Unknown parts are silently dropped (forward-compat).
- `itemsToParts(items)`: the reverse, for rendering.
- `walkActiveBranch(messages)`: traverse the `parentId` chain from the last `isActiveBranch` row to root.
- `joinItemsToMessages(msgs, items)`: group items by messageId.

## 7. Storage model

`src/lib/db/schema/shared.ts` (634 LOC, 20 tables mirrored client + server). Every syncable table carries `syncExpiresAt`. Text columns narrow via `.$type<>()` to validation-derived literal unions.

### 7.1 ER diagram

```
conversations (id, userId)                       syncExpiresAt
  |- conversationSettings (convId PK, CASCADE)   model/sampling/persona/preset/webSearch
  |- messages (convId, CASCADE)                  parentId self-ref (onDelete: SET NULL)
  |    |- messageItems (messageId, CASCADE)       text|image|file|tool_call|tool_result|task|pdf
  |    |- requestLogs (msgId PK, CASCADE)         full request/system/messages/headers debug
  |- conversationCharacters (convId+characterId PK, CASCADE)   orderIndex, isActive, overrides
  |- conversationLorebooks (convId+lorebookId PK, CASCADE)     orderIndex
  |- media (convId nullable, CASCADE)

characters (id, userId)        syncExpiresAt   <- SillyTavern-compatible
  |- (avatarMediaId -> media)
personas (id, userId)          syncExpiresAt
lorebooks (id, userId)         syncExpiresAt
  |- lorebookEntries (lorebookId, CASCADE)      keys, position, priority, injectionRole
samplingPresets (id, userId)   syncExpiresAt
cards (id, userId)             syncExpiresAt
  |- cardCharacters (cardId+characterId PK, CASCADE)
  |- cardLorebooks (cardId+lorebookId PK, CASCADE)

media (id, userId)             convId nullable (CASCADE), playgroundId nullable (CASCADE)
userThemes (userId PK)         syncExpiresAt
```

### 7.2 Key defaults and surprises

- `conversationSettings`: `authorNoteDepth=4`, `chatMemory=8`, `webSearchEngine="auto"`, `webSearchContextSize="medium"`, `streamingEnabled=true`. All sampling columns nullable.
- `messages.parentId` is `onDelete: "set null"` (NOT cascade). Deleting a parent orphans children to root rather than wiping a subtree. `useDeleteMessageMutation` rewires children to the deleted node's parent.
- `lorebookEntries`: `priority=100`, `position="before_char"`, `depth=4`, `injectionRole="user"`.
- `characters.alwaysActive=true`, `matchWholeWords=false`.

### 7.3 Scoping

`makeTableStore` (`src/lib/db/client/data/table-store.ts`) emits `{list, get, upsert, drop}`. `scopeUser: true` (default) ANDs `eq(table.userId, uid)` into WHERE and merges userId into upserts. Tables without a `userId` column (`conversationSettings`, `messages`, `messageItems`) pass `scopeUser: false` and scope via FK instead.

### 7.4 Server-only and client-only tables

- Server-only (`src/lib/db/schema/server.ts`): `moderation_log` (chat-relevant), `acp_checkout_sessions`, `acp_idempotency_keys`, 3 catalogs.
- Client-only (`src/lib/db/schema/client.ts`): `local_pending_sync` (PK `(kind, id)`), `local_meta` (KV, holds `migration_version`). Both excluded from cross-DB copy via `LOCAL_ONLY_TABLES`.

### 7.5 OPFS lifecycle

`src/lib/db/client/client.ts` `getLocalDb(userId)`: per-user file `${appName}-${userId}.sqlite3`, lazy WASM (~1.5MB), per-userId promise cache. Releases SyncAccessHandle on `pagehide`/`beforeunload`. Migration failure: dev salvages (copy surviving rows to a fresh DB, overwrite original); **prod rethrows and never wipes**.

### 7.6 Migrations

`schema-migrate/migrations.ts` reads the bundled `migrations.json`, enables `PRAGMA foreign_keys = ON`, runs forward-only from `local_meta.migration_version`, splits on `--> statement-breakpoint`. **No transaction wrapper** (SQLocal transactionMutex deadlocks on throw); idempotent error tolerance instead.

## 8. Client runtime (assistant-ui)

`src/components/pages/sidebar/chat/runtime/`. `ChatRuntimeProvider` is mounted in the `(chat)` layout and bridges `@assistant-ui/react` to local-first storage.

```
AssistantRuntimeProvider
  useRemoteThreadListRuntime
    adapter: createThreadListAdapter   (pure local: list/initialize/rename/delete/generateTitle)
    runtimeHook: ChatRuntimeHook
      useConvIdSync   -> mirrors active thread remoteId into convIdAtom
      useModelSync    -> two-way: conv.model seeds chatModelAtom; picker writes back to settings
      useChatTransport -> DefaultChatTransport
         body: async () => ({ model, convId, webSearch, overrides, chatContext })
                reads atoms via chatStore.get; builds chatContext from SQLocal
      useHistoryAdapter -> ThreadHistoryAdapter (load + append)
      useAISDKRuntime(chat, { adapters: { attachments, history } })
         wraps sendMessage with a per-conv stream lock
```

- **History adapter** (`chat-history-adapter.ts`): `load()` serves React Query cache, else SQLocal. `append()` persists message row + items via `partsToItems`, derives usage from `message.metadata.usage`, inserts a request log if debug metadata present, bumps conversation totals, invalidates queries, then `mirrorConvDeltaIfSynced`.
- **Thread list adapter** (`thread-list-adapter.ts`): `initialize` seeds conv + settings from `chatDefaultsAtom`. `rename`/`delete` use `mirrorConvPatchIfSynced` / `enqueuePending` on failure. `generateTitle` calls `POST /chat/title`, persists, mirrors patch.
- **Attachments** (`chat-utils.ts`): `createLocalAttachmentAdapter` writes file bytes as base64 into the local `media` table, returns `data:` URL parts. `ensureConvId()` pre-generates the conv so the media row has a stable cascade parent.
- **Guest migration** (`guest-local-db-migrate.tsx`): one-shot post-login `migrateGuestLocalDb(userId)`. Dedup via a per-user in-flight promise; the hydrator awaits it before reading.

### 8.1 State (`src/store/chat-store.ts`)

- `chatStoreAtom`: cookie-persisted (`atomWithStorage` + `jotaiCookieStorage`). Holds model, webSearch, sampler defaults, per-model sampler memory. No `getOnInit` so SSR and first client render match; selector atoms fall back to INITIAL per field (cookie-schema-drift defense).
- `convIdAtom`: in-memory, cross-window single source of truth for the active conversation. Read imperatively by the transport body and history adapter.
- `chatHelpersAtom`: publishes `setMessages`/`getMessages` so `thread.tsx` edit/delete can drive `useChat` from outside React.
- `chatStore`: the shared `createStore()` instance, provided by `jotai-provider.tsx`. Non-React callers (stream callbacks, `confirm()`) use `chatStore.get/set`.

### 8.2 Chat mutation hooks

`src/hooks/ai/chat-hook.ts` (13 hooks). All write SQLocal first, then mirror if synced, then invalidate React Query keys:

`useConversationsInfiniteQuery`, `useConversationQuery`, `useMessagesInfiniteQuery`, `useUpdateConversationMutation`, `useDeleteConversationMutation`, `useTaskStatusQuery`, `useFinalizeTaskMutation`, `useEditMessageMutation`, `useClearConversationMutation`, `useDuplicateConversationMutation` (deep clone with rewired parentId/messageId, fresh `syncExpiresAt=null`), `useConversationMarkdown`, `useSetActiveBranchMutation` (flip `isActiveBranch` on target + siblings), `useDeleteMessageMutation` (delete + rewire children).

## 9. Sync engine

8 kinds (`SYNC_KINDS`): characters, personas, lorebooks, presets, cards, conversations, playgroundSessions, theme. The first 7 are row-by-row `RP_SYNC_KINDS`; theme is single-row per userId.

**Gate**: mirror only when `syncExpiresAt != null` AND `userId > GUEST_USER_ID`.

### 9.1 Push (client -> server)

Mirror helpers (`src/hooks/ai/rp/shared.ts`):

- `mirrorSyncedRow(userId, kind, id, payload)`: `POST /sync/:kind/:id` with `keepExpiry: true` (preserves the 30-day window). Queues a `local_pending_sync` row on failure.
- `deleteSyncedRow` / `unmirrorIfSynced`: `DELETE /sync/:kind/:id`. Queues on failure.
- `mirrorConvIfSynced`: rebuild full conversation bundle, push, then `evictMediaBase64After`.
- `mirrorConvPatchIfSynced`: shallow conv-row patch (rename/title), skips bundle rebuild.
- `mirrorConvSettingsIfSynced`, `mirrorConvDeltaIfSynced`: settings-only / partial with `mergeMode`.
- `mirrorSessionIfSynced`: playground analog.

Merge modes (conversations only): `replace` (wipe + reinsert, default authoritative), `upsert` (PK merge), `append` (insert-only).

### 9.2 Server (`src/server/ai/sync/`)

4 endpoints: `GET /state`, `GET /:kind/:id/bundle`, `POST /:kind/:id` (set expiry + persist), `DELETE /:kind/:id` (clear expiry). Route `.derive` runs `sweepExpired(userId, sweepKey())` once per request (WeakSet-memoized). Per-kind `Value.Cast()` against bundle TypeBox schemas coerces and fills defaults; drift is logged, never rejected. Default TTL `DEFAULT_TTL_DAYS = 30`.

**Conversation pushes are self-contained**: a push carries the full bodies of every referenced character/persona/lorebook/preset, and the handler inserts those first inside the conversation's transaction so the `conversation_*` foreign keys resolve even if the entity was never synced on its own.

### 9.3 Pending queue + resilience

- `pending-sync.ts`: `enqueuePending` upserts a row by `(kind, id)`. `drainPending` replays up to `MAX_PENDING_ATTEMPTS = 5` with exponential backoff (`[0, 30s, 120s, 480s, 1800s]`); dead-letter surfaces a toast with manual retry. Payload rebuilt from current local state via `build-payload.ts` (theme special-cased).
- `scheduler.ts`: 60s drain on focus/online, cross-tab mutex.
- `resource-lock.ts`: cross-tab single-holder lock via BroadcastChannel; `LOCK_TTL_MS` covers a crashed holder; heartbeat while held. Used for the drain lock and the per-conv stream lock.

### 9.4 Two-stage hydrator (`sync-state-hydrator.ts`)

Mounted in chat + playground layouts, fire-once per userId. Serial throughout (SQLocal transactionMutex).

- **Stage 1 (always)**: local SQLocal reads seed the React Query cache.
- **Stage 2 (logged-in)**: `GET /sync/state` returns per-row `{id, updatedAt, syncExpiresAt}`; compare `updatedAt`, pull bundles for newer rows (batch `POST /sync/bundles`, chunk 16), `applyBundle` upserts. **Skips when the local row is newer** (never clobbers local edits). On `/chat/:convId` it excludes conversations (SSR already seeded) and catches up on idle.
- **Stage 3 (logged-in)**: `drainPending(userId)`.

### 9.5 Media asymmetry

The `media` table has an asymmetric sync rule:

- Client writes `dataBase64`; `r2Key`/`r2Url` stay null.
- The server's upload handler reads base64, uploads to R2, stamps `r2Key`/`r2Url`, stores `dataBase64 = null`.
- The hydrator's `rehydrateMedia` probes local first, fetches R2 only on first sight, and **never overwrites a present local cache** (a transient R2 failure preserves the local bytes).

R2 chat key namespace: `chat/<scope>/<convId>/<msgId>/<file>` where scope is `guest` for `userId=0` else `user`. The convId here is an R2 path segment, not a DB FK.

## 10. Roleplay (RP) layer

### 10.1 Entity factory

`makeRpEntity` (`src/hooks/ai/rp/factory.ts`) is the single CRUD source for characters/personas/lorebooks/presets/cards. Generic `<TItem, TCreateBody, TUpdateBody>` emitting `{useList, useItem, useCreate, useUpdate, useDelete}`. Each mutation: write SQLocal first, mirror via `mirrorSyncedRow`/`deleteSyncedRow` when synced, queue a pending row on RPC failure, invalidate list/item keys. Cards are bespoke (junction bundle); lorebooks use a custom mirror that pushes row + entries together.

RP entities have **zero server route surface** for mutation. All CRUD is client-side; only `/sync/:kind/:id` touches the server.

### 10.2 Bindings

`conversation_characters` and `conversation_lorebooks` join rows carry `orderIndex`, `isActive`, and `overrides`. Multi-character: the primary (first by orderIndex) drives `{{char}}`; non-primary characters with `alwaysActive=false` are trigger-gated via `triggers` + `matchWholeWords`. `useUpdateChatBindingsMutation` does `replaceLocalConversationBindings` (delete-all + insert) then `mirrorConvIfSynced`.

### 10.3 Apply card

`useApplyCardMutation` with `mode`:

- `replace`: wipe conv bindings, install the card's character + lorebook IDs.
- `merge`: union existing bindings with the card's (skip already-bound).

Optional `personaId` seeds `conversation_settings`. Then `mirrorConvIfSynced`.

### 10.4 Import / export

- **Conversations** (`src/lib/db/client/data/transfer/`): native `unorouter.1.0`, `orpg.3.0` (OpenRouter-compatible, lossless extras under `_unorouter_extension`), SillyTavern JSONL. Local-first; works for guests. Import remaps all entity IDs to avoid collisions.
- **Character cards** (`src/lib/ai/rp/character-card.ts`): SillyTavern v2/v3 via `@character-foundry/character-foundry` (PNG-embedded JSON, CharX, raw JSON). Export to PNG/CharX/Voxta/JSON.
- **Lorebooks / personas** (`lorebook-import.ts`, `persona-import.ts`): multi-format JSON.
- **RP export** (`rp-export.ts` + `use-export-mutation.ts`): client-only blob download; avatar bytes from base64 or R2 fallback.

## 11. Rendering

`src/components/ui/assistant-ui/`:

- `thread.tsx`: message routing (user/assistant/edit), branch picker (persists active branch, guarded to `branchCount >= 2` to avoid temp-ID 404s), edit-in-place, two-click delete confirm, streaming indicator (color shifts as duration exceeds a model threshold), composer with web search toggle and attachment dropzone.
- `markdown-text.tsx`: Shiki highlighting, remark-gfm + math, `rehypeQuoteSpans` (themed quote runs), strips `<think>` blocks, allows `data:image/*` URLs. Video mime -> `<video>`.
- `reasoning.tsx`: collapsible thinking block with streaming shimmer.
- `task-card.tsx`: video task status, polls `useTaskStatusQuery` on demand, finalizes to video markdown on success.
- `tool-fallback.tsx`: collapsible tool call (server tools minimal; others show args/result/error).
- `attachment.tsx`: image preview dialog, composer attachment grid.

UI pages: `(chat)/chat` (index), `[convId]`, `presets`, `cards`. RP dialogs (characters/personas/lorebooks) are lazy-mounted at the layout root so they survive sidebar unmount.

## 12. Constants

`src/lib/config/constants.ts`:

| Constant | Value | Use |
| --- | --- | --- |
| `GUEST_USER_ID` | 0 | guest sentinel; mirror gate |
| `FREE_MODEL_OUTPUT_CAP` | 8192 | max output tokens for free models |
| `FREE_MODEL_RACE_COUNT` | 5 | parallel free models for title + web-search classifier |
| `TAVILY_TIMEOUT_MS` | 5000 | web search abort |
| `MODERATION_TIMEOUT_MS` | 5000 | Creem gate abort |
| `MAX_RECURSIVE_LOREBOOK_PASSES` | 3 | lorebook recursion guard |
| `DEFAULT_TTL_DAYS` | 30 | sync expiry window |
| `MAX_PENDING_ATTEMPTS` | 5 | pending-sync retries before dead-letter |

R2 (`src/lib/config/r2.ts`): 50MB download cap, 100MB per-user quota, SSRF allowlist (CIDR + hostname + port 80/443), magic-byte verification.

## 13. Load-bearing invariants

1. **Transform order is locked** (`stream.service.ts:159`). Reordering breaks role alternation for GLM/Anthropic.
2. **No transactions in client SQLocal**. The transactionMutex deadlocks every later call if any statement throws. Use bare exec loops + `ON CONFLICT DO NOTHING`.
3. **Prod migration never wipes user data**. Only dev salvages.
4. **Media base64 asymmetry**. Client owns `dataBase64`; server owns R2 pointers. The hydrator never overwrites a present local cache.
5. **Conversation pushes are self-contained**. Referenced RP entity bodies travel inline and insert first so FKs resolve.
6. **Mirror gate**: `syncExpiresAt != null && userId > GUEST_USER_ID`.
7. **Moderation and web-search fail closed**. On error, deny (moderation) or no-search.
8. **Multi-character**: primary drives `{{char}}`; non-primary are trigger-gated.
9. **Hydrator skips local-newer rows**. `updatedAt` comparison protects offline edits.
10. **`messages.parentId` is SET NULL on delete**, not cascade. Deletes rewire children rather than wipe subtrees.

## 14. Footguns worth knowing

- `processUrls` (`stream/media-stream.ts:57`) returns an empty string for non-media models, dropping all link markdown. Currently unreachable (only media models reach `handleBufferedStream`), but if a text model is ever routed through the buffered path it silently nukes content. Guard if you touch that dispatch.
- Cookie schema drift: `chatStoreAtom` selector atoms fall back to INITIAL per field. If you add a field, give it a default in the fallback or old cookies read undefined.
- The transport body reads atoms imperatively at request time, not render time. State captured in a closure will be stale; read via `chatStore.get` inside the body builder.
