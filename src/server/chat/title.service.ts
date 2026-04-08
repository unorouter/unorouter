import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { getCheapestTextModel } from "@/lib/api/pricing-cache";

export async function generateChatTitle(
  apiKey: string,
  userId: number,
  convId: string,
  text: string,
) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, convId),
      eq(conversations.userId, userId),
    ),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  const modelName = await getCheapestTextModel();
  const provider = getProvider(serverEnv.guestApiKey ?? apiKey);

  const result = await generateText({
    model: provider.chatModel(modelName),
    system: `Generate a concise title (max 8 words) for this conversation based on the user's message.
The title MUST be in the same language as the user's message.
Return only the title text, no quotes or formatting.`,
    prompt: text,
    maxOutputTokens: 30,
  });

  const title = result.text.trim();
  await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, convId));

  return { title };
}
