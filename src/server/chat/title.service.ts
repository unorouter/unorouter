import { buildPricingSummary } from "@/lib/api/pricing";
import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { getPricing } from "@/openapi";
import { getProvider } from "@/server/constants";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";

let cheapestModelCache: { name: string; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getCheapestTextModel(): Promise<string> {
  if (
    cheapestModelCache &&
    Date.now() - cheapestModelCache.fetchedAt < CACHE_TTL
  ) {
    return cheapestModelCache.name;
  }
  const res = await getPricing();
  if (!res.data) throw new Error("Failed to fetch pricing");
  const summary = buildPricingSummary(res.data);
  const textModels = summary.models.filter(
    (m) => m.type === "text" && !m.isFixedPrice && m.inputPrice > 0,
  );
  if (textModels.length === 0) throw new Error("No text models available");
  const cheapest = textModels.reduce((min, m) =>
    m.inputPrice < min.inputPrice ? m : min,
  );
  cheapestModelCache = { name: cheapest.name, fetchedAt: Date.now() };
  return cheapest.name;
}

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

  const modelName = await getCheapestTextModel();
  const provider = getProvider(apiKey);

  const result = await generateText({
    model: provider.chatModel(modelName),
    system:
      "Generate a concise title (max 8 words) for this conversation based on the user's message. Return only the title text, no quotes or formatting.",
    prompt: text.slice(0, 500),
  });

  const title = result.text.trim();
  await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, convId));

  return { title };
}
