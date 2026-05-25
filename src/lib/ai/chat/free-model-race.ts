import { getFreeTextModels } from "@/lib/api/pricing-cache";
import { FREE_MODEL_RACE_COUNT } from "@/lib/config/constants";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";

export type FreeModelRaceArgs = {
  apiKey: string;
  systemPrompt: string;
  prompt: string;
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
  count?: number;
};

// Races N free text models via `Promise.any`. Throws if all fail or none free.
export async function freeModelRace(
  args: FreeModelRaceArgs,
): Promise<{ text: string; models: string[] }> {
  const count = args.count ?? FREE_MODEL_RACE_COUNT;
  const models = await getFreeTextModels(count);
  if (models.length === 0) throw new Error("no free models available");

  const provider = getProvider(args.apiKey ?? serverEnv.guestApiKey);
  const attempts = models.map((modelName) =>
    generateText({
      model: provider.chatModel(modelName),
      system: args.systemPrompt,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
      maxRetries: 0,
      ...(args.abortSignal ? { abortSignal: args.abortSignal } : {}),
    }),
  );
  const result = await Promise.any(attempts);
  return { text: result.text, models };
}
