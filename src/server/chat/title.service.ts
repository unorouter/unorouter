import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { getFreeTextModels } from "@/lib/api/pricing-cache";

const TITLE_SYSTEM_PROMPT = `Generate a concise title (max 8 words) for this conversation based on the user's message.
The title MUST be in the same language as the user's message.
Return only the title text, no quotes or formatting.`;

export async function generateChatTitle(
  apiKey: string,
  userId: number,
  convId: string,
  text: string,
) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, convId), eq(conversations.userId, userId)),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  const provider = getProvider(serverEnv.guestApiKey ?? apiKey);

  // Race up to 3 free models in parallel and take the first successful response.
  // Free models can be flaky (rate limits, channel exhaustion); racing them keeps
  // titles fast without burning paid quota for a 30-token request.
  const freeModels = await getFreeTextModels(3);
  if (freeModels.length === 0) throw new Error(msg("ERRORS.NO_TEXT_MODELS"));

  const attempts = freeModels.map((modelName) =>
    generateText({
      model: provider.chatModel(modelName),
      system: TITLE_SYSTEM_PROMPT,
      prompt: text,
      maxOutputTokens: 30,
      maxRetries: 0,
    }),
  );

  const result = await Promise.any(attempts);
  const title = result.text.trim();
  await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, convId));

  return { title };
}
