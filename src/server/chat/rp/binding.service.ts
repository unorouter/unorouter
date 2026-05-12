import { msg } from "@/lib/config/constants";
import { assertFound } from "@/lib/db/assertions";
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
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { UpdateConversationBindingsBody } from "@/lib/validation/chat";
import { expandTemplateVars } from "../augmentation/prompt-assembler.service";
import dayjs from "dayjs";
import { and, asc, eq, inArray } from "drizzle-orm";

export async function getBindings(userId: number, convId: string) {
  const db = getDb();
  const ownership = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .limit(1);
  assertFound(ownership);

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
    assertFound(ownership);

    if (body.characters !== undefined) {
      // Verify every character id belongs to this user before binding;
      // prevents attaching another user's character to a conversation.
      if (body.characters.length > 0) {
        const ids = body.characters.map((c) => c.characterId);
        const owned = await tx
          .select({ id: characters.id })
          .from(characters)
          .where(
            and(eq(characters.userId, userId), inArray(characters.id, ids)),
          );
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

    // Seed the bound character's first message as the opening assistant turn,
    // but only when the conversation has no messages yet (avoid double-seeding
    // on rebinding). Mirrors SillyTavern's "first_mes" behavior.
    if (body.characters && body.characters.length > 0) {
      const existing = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.convId, convId))
        .limit(1);
      if (existing.length === 0) {
        const primaryId = body.characters[0].characterId;
        const charRows = await tx
          .select()
          .from(characters)
          .where(eq(characters.id, primaryId))
          .limit(1);
        const primary = charRows[0];
        if (primary?.firstMessage) {
          const settingsRows = await tx
            .select({ personaId: conversationSettings.personaId })
            .from(conversationSettings)
            .where(eq(conversationSettings.convId, convId))
            .limit(1);
          const personaId = settingsRows[0]?.personaId;
          const persona = personaId
            ? (
                await tx
                  .select()
                  .from(personas)
                  .where(eq(personas.id, personaId))
                  .limit(1)
              )[0]
            : undefined;
          const greeting = expandTemplateVars(primary.firstMessage, {
            user: persona?.name ?? "User",
            char: primary.name,
            user_description: persona?.description ?? "",
            char_description: primary.description ?? "",
            scenario: primary.scenario ?? "",
          });
          const msgId = uid();
          const now = dayjs().toDate();
          await tx.insert(messages).values({
            id: msgId,
            convId,
            parentId: null,
            characterId: primaryId,
            role: "assistant",
            model: null,
            branchIndex: 0,
            isActiveBranch: true,
            isEdited: false,
            createdAt: now,
            updatedAt: now,
          });
          await tx.insert(messageItems).values({
            id: uid(),
            messageId: msgId,
            sequenceIndex: 0,
            outputIndex: null,
            type: "text",
            data: { text: greeting },
          });
          logger.info("Seeded character greeting", {
            context: "chat.bindings.greeting",
            convId,
            characterId: primaryId,
          });
        }
      }
    }

    return getBindings(userId, convId);
  });
}
