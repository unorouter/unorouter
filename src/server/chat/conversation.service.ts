import { msg } from "@/lib/config/constants";
import { deleteR2Prefix } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import {
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversationSettings,
  conversations,
  lorebooks,
  messageItems,
  messages,
  personas,
  samplingPresets,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import dayjs from "dayjs";
import { logger } from "@/lib/utils/logger";
import type {
  ChatSearchQuery,
  CreateConversationBody,
  UpdateConversationBody,
  UpdateConversationBindingsBody,
  UpdateConversationSettingsBody,
} from "@/lib/validation/chat";
import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Pagination: messages + nested items, ordered chronologically
// ---------------------------------------------------------------------------

export async function getPaginatedMessages(
  convId: string,
  query: { p?: number; page_size?: number },
) {
  const db = getDb();
  const page = query.p ?? 1;
  const pageSize = query.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  const [msgRows, countResult] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.convId, convId))
      .orderBy(sql`${messages.createdAt} DESC, rowid DESC`)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.convId, convId)),
  ]);

  const ordered = msgRows.reverse();

  // Fetch items for the page in one query
  const ids = ordered.map((m) => m.id);
  const items =
    ids.length > 0
      ? await db
          .select()
          .from(messageItems)
          .where(inArray(messageItems.messageId, ids))
          .orderBy(asc(messageItems.messageId), asc(messageItems.sequenceIndex))
      : [];

  const itemsByMsg = new Map<string, typeof items>();
  for (const it of items) {
    const arr = itemsByMsg.get(it.messageId) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId, arr);
  }

  return {
    messages: ordered.map((m) => ({
      ...m,
      items: itemsByMsg.get(m.id) ?? [],
    })),
    totalMessages: countResult[0]?.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listConversations(
  userId: number,
  query: ChatSearchQuery,
  guestConvIds: string[],
) {
  const db = getDb();
  const page = query.p ?? 1;
  const pageSize = query.page_size ?? 20;
  const offset = (page - 1) * pageSize;
  const keyword = query.keyword?.trim();

  const isGuest = userId === 0 && guestConvIds.length > 0;

  if (userId === 0 && !isGuest) return { items: [], total: 0, page, pageSize };

  const conditions = isGuest
    ? [inArray(conversations.id, guestConvIds), eq(conversations.userId, 0)]
    : [eq(conversations.userId, userId)];

  if (keyword) {
    conditions.push(like(conversations.title, `%${keyword}%`));
  }
  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: conversations.id,
        title: conversations.title,
        shareId: conversations.shareId,
        totalCost: conversations.totalCost,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        // Pull default model from settings (1:1)
        model: conversationSettings.defaultModel,
      })
      .from(conversations)
      .leftJoin(
        conversationSettings,
        eq(conversationSettings.convId, conversations.id),
      )
      .where(where)
      .orderBy(desc(conversations.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0, page, pageSize };
}

// ---------------------------------------------------------------------------
// Create / read
// ---------------------------------------------------------------------------

export async function createConversation(
  userId: number,
  body: CreateConversationBody,
) {
  const db = getDb();
  const id = body.id ?? uid();
  const now = dayjs().toDate();

  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({
      id,
      userId,
      title: body.title ?? null,
      createdAt: now,
      updatedAt: now,
    });

    // Seed `conversation_settings` from the optional overrides the client
    // sends from its jotai defaults, so the first turn already runs with the
    // user's preferred knobs.
    const o = body.overrides;
    await tx.insert(conversationSettings).values({
      convId: id,
      defaultModel: body.model,
      reasoningEffort: o?.reasoningEffort ?? null,
      ...(o?.chatMemory !== undefined && { chatMemory: o.chatMemory }),
      systemPromptOverride: o?.systemPromptOverride ?? null,
      authorNote: o?.authorNote ?? null,
      ...(o?.authorNoteDepth !== undefined && {
        authorNoteDepth: o.authorNoteDepth,
      }),
      ...(o?.webSearchEngine !== undefined && {
        webSearchEngine: o.webSearchEngine,
      }),
      ...(o?.webSearchContextSize !== undefined && {
        webSearchContextSize: o.webSearchContextSize,
      }),
      temperature: o?.temperature ?? null,
      topP: o?.topP ?? null,
      topK: o?.topK ?? null,
      minP: o?.minP ?? null,
      topA: o?.topA ?? null,
      frequencyPenalty: o?.frequencyPenalty ?? null,
      presencePenalty: o?.presencePenalty ?? null,
      repetitionPenalty: o?.repetitionPenalty ?? null,
      maxTokens: o?.maxTokens ?? null,
      updatedAt: now,
    });
  });

  return { id, model: body.model, title: body.title ?? null };
}

export async function getConversation(userId: number, convId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      shareId: conversations.shareId,
      totalInputTokens: conversations.totalInputTokens,
      totalOutputTokens: conversations.totalOutputTokens,
      totalCost: conversations.totalCost,
      archivedAt: conversations.archivedAt,
      starredAt: conversations.starredAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      model: conversationSettings.defaultModel,
    })
    .from(conversations)
    .leftJoin(
      conversationSettings,
      eq(conversationSettings.convId, conversations.id),
    )
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .limit(1);

  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return rows[0];
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateConversation(
  userId: number,
  convId: string,
  body: UpdateConversationBody,
) {
  const db = getDb();
  const now = dayjs().toDate();

  await db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    if (body.title !== undefined) {
      await tx
        .update(conversations)
        .set({ title: body.title, updatedAt: now })
        .where(eq(conversations.id, convId));
    } else {
      await tx
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, convId));
    }

    if (body.model !== undefined) {
      await tx
        .update(conversationSettings)
        .set({ defaultModel: body.model, updatedAt: now })
        .where(eq(conversationSettings.convId, convId));
    }
  });

  return { id: convId, title: body.title, model: body.model };
}

export async function updateSettings(
  userId: number,
  convId: string,
  body: UpdateConversationSettingsBody,
) {
  const db = getDb();
  const now = dayjs().toDate();

  return db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    // Verify persona/preset ids belong to this user before persisting them.
    // Guests (userId=0) cannot own personas/presets, so we silently drop any
    // such references in the body rather than 404'ing the whole update.
    if (userId === 0) {
      body.personaId = undefined;
      body.presetId = undefined;
    }
    if (body.personaId) {
      const owned = await tx
        .select({ id: personas.id })
        .from(personas)
        .where(and(eq(personas.userId, userId), eq(personas.id, body.personaId)))
        .limit(1);
      if (owned.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
    }
    if (body.presetId) {
      const owned = await tx
        .select({ id: samplingPresets.id })
        .from(samplingPresets)
        .where(
          and(
            eq(samplingPresets.userId, userId),
            eq(samplingPresets.id, body.presetId),
          ),
        )
        .limit(1);
      if (owned.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
    }

    const updates: Record<string, unknown> = { updatedAt: now };
    for (const key of Object.keys(body) as (keyof typeof body)[]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    await tx
      .update(conversationSettings)
      .set(updates)
      .where(eq(conversationSettings.convId, convId));

    const rows = await tx
      .select()
      .from(conversationSettings)
      .where(eq(conversationSettings.convId, convId))
      .limit(1);
    return rows[0];
  });
}

export async function getSettings(userId: number, convId: string) {
  const db = getDb();
  const ownership = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .limit(1);
  if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

  const rows = await db
    .select()
    .from(conversationSettings)
    .where(eq(conversationSettings.convId, convId))
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Bindings (m:n: characters + lorebooks)
// ---------------------------------------------------------------------------

export async function getBindings(userId: number, convId: string) {
  const db = getDb();
  const ownership = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .limit(1);
  if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

  const [chars, lbs] = await Promise.all([
    db
      .select()
      .from(conversationCharacters)
      .where(eq(conversationCharacters.convId, convId))
      .orderBy(asc(conversationCharacters.orderIndex)),
    db
      .select()
      .from(conversationLorebooks)
      .where(eq(conversationLorebooks.convId, convId))
      .orderBy(asc(conversationLorebooks.orderIndex)),
  ]);

  return { characters: chars, lorebooks: lbs };
}

export async function updateBindings(
  userId: number,
  convId: string,
  body: UpdateConversationBindingsBody,
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    if (body.characters !== undefined) {
      // Verify every character id belongs to this user before binding;
      // prevents attaching another user's character to a conversation.
      if (body.characters.length > 0) {
        const ids = body.characters.map((c) => c.characterId);
        const owned = await tx
          .select({ id: characters.id })
          .from(characters)
          .where(and(eq(characters.userId, userId), inArray(characters.id, ids)));
        if (owned.length !== new Set(ids).size) {
          throw new Error(msg("ERRORS.NOT_FOUND"));
        }
      }
      await tx
        .delete(conversationCharacters)
        .where(eq(conversationCharacters.convId, convId));
      if (body.characters.length > 0) {
        await tx.insert(conversationCharacters).values(
          body.characters.map((c, i) => ({
            convId,
            characterId: c.characterId,
            orderIndex: c.orderIndex ?? i,
            isActive: c.isActive ?? true,
            overrides: c.overrides ?? null,
          })),
        );
      }
    }

    if (body.lorebookIds !== undefined) {
      // Same ownership gate for lorebook ids.
      if (body.lorebookIds.length > 0) {
        const owned = await tx
          .select({ id: lorebooks.id })
          .from(lorebooks)
          .where(
            and(
              eq(lorebooks.userId, userId),
              inArray(lorebooks.id, body.lorebookIds),
            ),
          );
        if (owned.length !== new Set(body.lorebookIds).size) {
          throw new Error(msg("ERRORS.NOT_FOUND"));
        }
      }
      await tx
        .delete(conversationLorebooks)
        .where(eq(conversationLorebooks.convId, convId));
      if (body.lorebookIds.length > 0) {
        await tx.insert(conversationLorebooks).values(
          body.lorebookIds.map((lorebookId, i) => ({
            convId,
            lorebookId,
            orderIndex: i,
          })),
        );
      }
    }

    return getBindings(userId, convId);
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteConversation(userId: number, convId: string) {
  const db = getDb();
  const conv = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .limit(1);
  if (conv.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

  const scope = conv[0].userId === 0 ? "guest" : "user";
  try {
    await deleteR2Prefix(`chat/${scope}/${convId}/`);
  } catch (err) {
    logger.error("R2 cleanup failed for conversation, proceeding with delete", {
      context: "conversation.delete",
      convId,
      error: String(err),
    });
  }
  await db.delete(conversations).where(eq(conversations.id, conv[0].id));

  return { id: convId };
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export async function createShareLink(userId: number, convId: string) {
  const db = getDb();
  const shareId = uid(12);

  const result = await db
    .update(conversations)
    .set({ shareId })
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .returning({ id: conversations.id });

  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { shareId };
}

export async function revokeShareLink(userId: number, convId: string) {
  const db = getDb();
  const result = await db
    .update(conversations)
    .set({ shareId: null })
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .returning({ id: conversations.id });

  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { id: convId };
}

export async function getSharedConversation(
  shareId: string,
  query: { p?: number; page_size?: number },
) {
  const db = getDb();
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      totalInputTokens: conversations.totalInputTokens,
      totalOutputTokens: conversations.totalOutputTokens,
      totalCost: conversations.totalCost,
      model: conversationSettings.defaultModel,
    })
    .from(conversations)
    .leftJoin(
      conversationSettings,
      eq(conversationSettings.convId, conversations.id),
    )
    .where(eq(conversations.shareId, shareId))
    .limit(1);

  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  const conv = rows[0];

  const paginated = await getPaginatedMessages(conv.id, query);
  return { ...conv, ...paginated };
}

export async function getConversationOrShared(userId: number, convId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      shareId: conversations.shareId,
      totalInputTokens: conversations.totalInputTokens,
      totalOutputTokens: conversations.totalOutputTokens,
      totalCost: conversations.totalCost,
      archivedAt: conversations.archivedAt,
      starredAt: conversations.starredAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      model: conversationSettings.defaultModel,
    })
    .from(conversations)
    .leftJoin(
      conversationSettings,
      eq(conversationSettings.convId, conversations.id),
    )
    .where(eq(conversations.id, convId))
    .limit(1);
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  const conv = rows[0];
  if (conv.userId !== userId && conv.userId !== 0 && !conv.shareId)
    throw new Error(msg("ERRORS.NOT_FOUND"));
  return conv;
}

export async function claimConversations(userId: number, convIds: string[]) {
  if (convIds.length === 0) return { claimed: 0 };
  const db = getDb();
  const result = await db
    .update(conversations)
    .set({ userId, updatedAt: dayjs().toDate() })
    .where(
      and(eq(conversations.userId, 0), inArray(conversations.id, convIds)),
    )
    .returning({ id: conversations.id });
  return { claimed: result.length };
}

// ---------------------------------------------------------------------------
// Clear: drop all messages + items, keep settings, bindings, title, totals
// ---------------------------------------------------------------------------

export async function clearConversation(userId: number, convId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    await tx.delete(messages).where(eq(messages.convId, convId));
    await tx
      .update(conversations)
      .set({ updatedAt: dayjs().toDate() })
      .where(eq(conversations.id, convId));
    return { id: convId };
  });
}

// ---------------------------------------------------------------------------
// Duplicate: clone messages, items, settings, bindings into a new conversation
// ---------------------------------------------------------------------------

export async function duplicateConversation(userId: number, convId: string) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const srcRows = await tx
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (srcRows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
    const src = srcRows[0];

    const newConvId = uid();
    const now = dayjs().toDate();
    const dupTitle = src.title ? `${src.title} (copy)` : null;

    await tx.insert(conversations).values({
      id: newConvId,
      userId,
      title: dupTitle,
      totalInputTokens: src.totalInputTokens,
      totalOutputTokens: src.totalOutputTokens,
      totalCost: src.totalCost,
      createdAt: now,
      updatedAt: now,
    });

    const settingsRows = await tx
      .select()
      .from(conversationSettings)
      .where(eq(conversationSettings.convId, convId))
      .limit(1);
    if (settingsRows[0]) {
      const s = settingsRows[0];
      await tx.insert(conversationSettings).values({
        convId: newConvId,
        defaultModel: s.defaultModel,
        personaId: s.personaId,
        presetId: s.presetId,
        systemPromptOverride: s.systemPromptOverride,
        authorNote: s.authorNote,
        authorNoteDepth: s.authorNoteDepth,
        chatMemory: s.chatMemory,
        reasoningEffort: s.reasoningEffort,
        webSearchEnabled: s.webSearchEnabled,
        webSearchEngine: s.webSearchEngine,
        webSearchContextSize: s.webSearchContextSize,
        temperature: s.temperature,
        topP: s.topP,
        topK: s.topK,
        minP: s.minP,
        topA: s.topA,
        frequencyPenalty: s.frequencyPenalty,
        presencePenalty: s.presencePenalty,
        repetitionPenalty: s.repetitionPenalty,
        maxTokens: s.maxTokens,
        updatedAt: now,
      });
    }

    const charBindings = await tx
      .select()
      .from(conversationCharacters)
      .where(eq(conversationCharacters.convId, convId));
    if (charBindings.length > 0) {
      await tx.insert(conversationCharacters).values(
        charBindings.map((b) => ({
          convId: newConvId,
          characterId: b.characterId,
          orderIndex: b.orderIndex,
          isActive: b.isActive,
          overrides: b.overrides,
        })),
      );
    }

    const lbBindings = await tx
      .select()
      .from(conversationLorebooks)
      .where(eq(conversationLorebooks.convId, convId));
    if (lbBindings.length > 0) {
      await tx.insert(conversationLorebooks).values(
        lbBindings.map((b) => ({
          convId: newConvId,
          lorebookId: b.lorebookId,
          orderIndex: b.orderIndex,
        })),
      );
    }

    const srcMessages = await tx
      .select()
      .from(messages)
      .where(eq(messages.convId, convId))
      .orderBy(asc(messages.createdAt));

    const idMap = new Map<string, string>();
    for (const m of srcMessages) idMap.set(m.id, uid());

    if (srcMessages.length > 0) {
      await tx.insert(messages).values(
        srcMessages.map((m) => ({
          id: idMap.get(m.id)!,
          convId: newConvId,
          parentId: m.parentId ? idMap.get(m.parentId) ?? null : null,
          characterId: m.characterId,
          role: m.role,
          model: m.model,
          generationId: m.generationId,
          inputTokens: m.inputTokens,
          outputTokens: m.outputTokens,
          cost: m.cost,
          durationMs: m.durationMs,
          tokensPerSecond: m.tokensPerSecond,
          branchIndex: m.branchIndex,
          isActiveBranch: m.isActiveBranch,
          isEdited: m.isEdited,
          isCollapsed: m.isCollapsed,
          rawResponse: m.rawResponse,
          createdAt: m.createdAt,
          updatedAt: now,
        })),
      );

      const srcItems = await tx
        .select()
        .from(messageItems)
        .where(
          inArray(
            messageItems.messageId,
            srcMessages.map((m) => m.id),
          ),
        )
        .orderBy(asc(messageItems.messageId), asc(messageItems.sequenceIndex));

      if (srcItems.length > 0) {
        await tx.insert(messageItems).values(
          srcItems.map((it) => ({
            id: uid(),
            messageId: idMap.get(it.messageId)!,
            sequenceIndex: it.sequenceIndex,
            outputIndex: it.outputIndex,
            type: it.type,
            data: it.data,
          })),
        );
      }
    }

    return { id: newConvId, title: dupTitle };
  });
}

// ---------------------------------------------------------------------------
// Markdown: render the active branch as markdown for clipboard copy
// ---------------------------------------------------------------------------

export async function getConversationMarkdown(userId: number, convId: string) {
  const db = getDb();

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);
  if (convRows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  const conv = convRows[0];
  // Match getConversationOrShared: allow guest convs (userId=0) and shared.
  if (conv.userId !== userId && conv.userId !== 0 && !conv.shareId)
    throw new Error(msg("ERRORS.NOT_FOUND"));

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(asc(messages.createdAt));

  const itemRows =
    msgRows.length > 0
      ? await db
          .select()
          .from(messageItems)
          .where(
            inArray(
              messageItems.messageId,
              msgRows.map((m) => m.id),
            ),
          )
          .orderBy(asc(messageItems.messageId), asc(messageItems.sequenceIndex))
      : [];

  const itemsByMsg = new Map<string, typeof itemRows>();
  for (const it of itemRows) {
    const arr = itemsByMsg.get(it.messageId) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId, arr);
  }

  // Walk only the active branch from the latest active tip back to root.
  const byId = new Map(msgRows.map((m) => [m.id, m]));
  const activeTip = [...msgRows]
    .reverse()
    .find((m) => m.isActiveBranch !== false);
  const path: typeof msgRows = [];
  let cur = activeTip;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  const lines: string[] = [];
  if (conv.title) lines.push(`# ${conv.title}`, "");

  for (const m of path) {
    const items = itemsByMsg.get(m.id) ?? [];
    const heading =
      m.role === "user"
        ? "## User"
        : m.role === "assistant"
          ? m.model
            ? `## Assistant (${m.model})`
            : "## Assistant"
          : `## ${m.role.charAt(0).toUpperCase()}${m.role.slice(1)}`;
    lines.push(heading, "");

    for (const it of items) {
      const data = it.data as Record<string, unknown>;
      if (it.type === "text") {
        const text = typeof data.text === "string" ? data.text : "";
        if (text) lines.push(text, "");
      } else if (it.type === "reasoning") {
        const text = typeof data.text === "string" ? data.text : "";
        if (text) {
          lines.push("> _Reasoning:_", "");
          for (const ln of text.split("\n")) lines.push(`> ${ln}`);
          lines.push("");
        }
      } else if (it.type === "tool_call") {
        const name = typeof data.tool_name === "string" ? data.tool_name : "";
        lines.push(`_Tool call:_ \`${name}\``, "");
      } else if (it.type === "tool_result") {
        lines.push(`_Tool result_`, "");
      } else if (it.type === "image" || it.type === "file") {
        const url = typeof data.url === "string" ? data.url : "";
        if (url) lines.push(`![${it.type}](${url})`, "");
      } else if (it.type === "task") {
        const taskId = typeof data.task_id === "string" ? data.task_id : "";
        lines.push(`_Task ${taskId}_`, "");
      }
    }
  }

  return { markdown: lines.join("\n").trimEnd() };
}
