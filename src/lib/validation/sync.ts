import type { Static } from "elysia";
import { t } from "elysia";
import {
  messageItemType,
  messageRole,
  updateConversationSettingsBody,
} from "./chat";
import { generationStatus, generationVisibility } from "./playground";

import {
  BATCH_BUNDLE_MAX_REQUESTS,
  RP_SYNC_KINDS,
  SYNC_KINDS,
} from "./sync-constants";

export const syncKind = t.Union(SYNC_KINDS.map((k) => t.Literal(k)));

export const rpSyncKind = t.Union(RP_SYNC_KINDS.map((k) => t.Literal(k)));
export type RpSyncKind = Static<typeof rpSyncKind>;

// mergeMode: replace=delete+insert; upsert=PK upsert; append=insert-only.
// Conversations only.
export const syncMergeMode = t.Union([
  t.Literal("replace"),
  t.Literal("upsert"),
  t.Literal("append"),
]);
export type SyncMergeMode = Static<typeof syncMergeMode>;

// Loose at boundary; per-kind handler casts against `*BundleBody`.
export const syncRequestBody = t.Object({
  days: t.Optional(t.Integer({ minimum: 1, maximum: 90 })),
  payload: t.Optional(t.Unknown()),
  // True = preserve syncExpiresAt (mirror PATCH on save).
  keepExpiry: t.Optional(t.Boolean()),
  mergeMode: t.Optional(syncMergeMode),
});
export type SyncRequestBody = Static<typeof syncRequestBody>;

export const syncParams = t.Object({
  kind: syncKind,
  id: t.String({ minLength: 1, maxLength: 64 }),
});
export type SyncParams = Static<typeof syncParams>;

export const batchBundleRequestBody = t.Object({
  requests: t.Array(
    t.Object({
      kind: syncKind,
      id: t.String({ minLength: 1, maxLength: 64 }),
    }),
    { minItems: 1, maxItems: BATCH_BUNDLE_MAX_REQUESTS },
  ),
});
export type BatchBundleRequestBody = Static<typeof batchBundleRequestBody>;

// Bundle payload schemas: validate `POST /sync/:kind/:id` payload before the
// handler reads it. `Value.Cast` coerces, fills defaults, drops extras.

const ID = t.String({ minLength: 1, maxLength: 64 });
const NullableId = t.Union([ID, t.Null()]);
const NullableString = t.Union([t.String(), t.Null()]);

// cards
export const cardBundleBody = t.Object({
  card: t.Optional(
    t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(NullableString),
      personaId: t.Optional(NullableId),
    }),
  ),
  cardCharacters: t.Optional(
    t.Array(
      t.Object({
        characterId: ID,
        orderIndex: t.Optional(t.Number()),
      }),
    ),
  ),
  cardLorebooks: t.Optional(
    t.Array(
      t.Object({
        lorebookId: ID,
        orderIndex: t.Optional(t.Number()),
      }),
    ),
  ),
});
export type CardBundleBody = Static<typeof cardBundleBody>;

// conversations: includes settings + referenced RP entity bodies + child rows.
const ConversationRow = t.Object({
  title: t.Optional(NullableString),
  totalInputTokens: t.Optional(t.Number()),
  totalOutputTokens: t.Optional(t.Number()),
  totalCost: t.Optional(t.Number()),
});

const ConvSettingsRow = t.Composite([
  updateConversationSettingsBody,
  t.Object({ defaultModel: t.Optional(t.String()) }),
]);

const ConvCharacterBinding = t.Object({
  characterId: ID,
  orderIndex: t.Optional(t.Number()),
  isActive: t.Optional(t.Boolean()),
  talkness: t.Optional(t.Union([t.Number(), t.Null()])),
  overrides: t.Optional(t.Unknown()),
});

const ConvLorebookBinding = t.Object({
  lorebookId: ID,
  orderIndex: t.Optional(t.Number()),
});

const MessageRow = t.Object({
  id: ID,
  parentId: t.Optional(NullableId),
  characterId: t.Optional(NullableId),
  role: messageRole,
  model: t.Optional(NullableString),
  playgroundId: t.Optional(NullableId),
  inputTokens: t.Optional(t.Union([t.Number(), t.Null()])),
  outputTokens: t.Optional(t.Union([t.Number(), t.Null()])),
  cost: t.Optional(t.Union([t.Number(), t.Null()])),
  durationMs: t.Optional(t.Union([t.Number(), t.Null()])),
  tokensPerSecond: t.Optional(t.Union([t.Number(), t.Null()])),
  branchIndex: t.Optional(t.Number()),
  isActiveBranch: t.Optional(t.Boolean()),
  isEdited: t.Optional(t.Boolean()),
});

const MessageItemRow = t.Object({
  id: ID,
  messageId: ID,
  sequenceIndex: t.Number(),
  outputIndex: t.Optional(t.Union([t.Number(), t.Null()])),
  type: messageItemType,
  data: t.Unknown(),
});

const MediaRow = t.Object({
  id: ID,
  playgroundId: t.Optional(NullableId),
  sequenceIndex: t.Optional(t.Union([t.Number(), t.Null()])),
  upstreamResultUrl: t.Optional(NullableString),
  r2Key: t.Optional(NullableString),
  r2Url: t.Optional(NullableString),
  dataBase64: t.Optional(NullableString),
  mimeType: t.String(),
  sizeBytes: t.Number(),
  width: t.Optional(t.Union([t.Number(), t.Null()])),
  height: t.Optional(t.Union([t.Number(), t.Null()])),
  extractedText: t.Optional(NullableString),
});

const RequestLogRow = t.Object({
  msgId: ID,
  requestBody: t.Unknown(),
  assembledSystem: t.Optional(NullableString),
  finalMessages: t.Unknown(),
  responseHeaders: t.Optional(
    t.Union([t.Record(t.String(), t.String()), t.Null()]),
  ),
  droppedParams: t.Optional(NullableString),
  requestId: t.Optional(NullableString),
  inputTokens: t.Optional(t.Union([t.Number(), t.Null()])),
  outputTokens: t.Optional(t.Union([t.Number(), t.Null()])),
  cost: t.Optional(t.Union([t.Number(), t.Null()])),
  durationMs: t.Optional(t.Union([t.Number(), t.Null()])),
  tokensPerSecond: t.Optional(t.Union([t.Number(), t.Null()])),
});

// Referenced RP entities ride inline so the conversation is self-contained.
const RefCharacter = t.Object({
  id: ID,
  name: t.Optional(t.String()),
  description: t.Optional(NullableString),
});
const RefPersona = t.Object({
  id: ID,
  name: t.Optional(t.String()),
  description: t.Optional(NullableString),
});
const RefPreset = t.Object({ id: ID, name: t.Optional(t.String()) });
const RefLorebook = t.Object({
  lorebook: t.Optional(t.Object({ id: ID, name: t.Optional(t.String()) })),
  entries: t.Optional(t.Array(t.Unknown())),
});

export const conversationBundleBody = t.Object({
  conversation: t.Optional(ConversationRow),
  settings: t.Optional(t.Union([ConvSettingsRow, t.Null()])),
  conversationCharacters: t.Optional(t.Array(ConvCharacterBinding)),
  conversationLorebooks: t.Optional(t.Array(ConvLorebookBinding)),
  messages: t.Optional(t.Array(MessageRow)),
  messageItems: t.Optional(t.Array(MessageItemRow)),
  media: t.Optional(t.Array(MediaRow)),
  requestLogs: t.Optional(t.Array(RequestLogRow)),
  characters: t.Optional(
    t.Array(t.Composite([RefCharacter, t.Record(t.String(), t.Unknown())])),
  ),
  personas: t.Optional(
    t.Array(t.Composite([RefPersona, t.Record(t.String(), t.Unknown())])),
  ),
  lorebooks: t.Optional(t.Array(RefLorebook)),
  presets: t.Optional(
    t.Array(t.Composite([RefPreset, t.Record(t.String(), t.Unknown())])),
  ),
});
export type ConversationBundleBody = Static<typeof conversationBundleBody>;

// playgroundSessions: session row + child playgrounds + child media.
const PlaygroundSessionRow = t.Object({
  title: t.Optional(NullableString),
  firstModel: t.Optional(NullableString),
  snapshotCount: t.Optional(t.Number()),
  imageCount: t.Optional(t.Number()),
  expiresAt: t.Optional(t.Date()),
});

const PlaygroundRow = t.Object({
  id: ID,
  sessionOrder: t.Number(),
  requestedCount: t.Optional(t.Number()),
  taskId: t.Optional(NullableString),
  model: t.String(),
  prompt: t.String(),
  negativePrompt: t.Optional(NullableString),
  params: t.Optional(t.Unknown()),
  loras: t.Optional(t.Unknown()),
  references: t.Optional(t.Unknown()),
  extraParams: t.Optional(t.Unknown()),
  status: t.Optional(generationStatus),
  progress: t.Optional(NullableString),
  costQuota: t.Optional(t.Union([t.Number(), t.Null()])),
  visibility: t.Optional(generationVisibility),
  flagged: t.Optional(t.Boolean()),
  flagReason: t.Optional(NullableString),
  remixCount: t.Optional(t.Number()),
  likeCount: t.Optional(t.Number()),
  remixedFrom: t.Optional(NullableString),
  errorMessage: t.Optional(NullableString),
  submittedKey: t.Optional(NullableString),
  expiresAt: t.Optional(t.Date()),
});

export const playgroundSessionBundleBody = t.Object({
  session: t.Optional(PlaygroundSessionRow),
  playgrounds: t.Optional(t.Array(PlaygroundRow)),
  media: t.Optional(t.Array(MediaRow)),
});
export type PlaygroundSessionBundleBody = Static<
  typeof playgroundSessionBundleBody
>;

// theme: accepts `{ themeJson }` envelope or raw JSON. Stored as opaque blob.
export const themeBundleBody = t.Union([
  t.Object({ themeJson: t.Unknown() }),
  t.Record(t.String(), t.Unknown()),
]);
export type ThemeBundleBody = Static<typeof themeBundleBody>;
