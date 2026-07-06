import type {
  FreeModelGenerate,
  FreeModelRaceArgs,
} from "@/lib/ai/chat/free-model-race";
import { getFreeTextModels } from "@/lib/api/pricing-cache";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";

export function serverFreeModelRaceDeps(
  apiKey: string,
): Pick<FreeModelRaceArgs, "listFreeModels" | "generate"> {
  const provider = getProvider(apiKey ?? serverEnv.guestApiKey);
  const generate: FreeModelGenerate = (modelName, opts) =>
    generateText({
      model: provider.chatModel(modelName),
      system: opts.systemPrompt,
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 0,
      ...(opts.abortSignal ? { abortSignal: opts.abortSignal } : {}),
    });
  return {
    listFreeModels: () => getFreeTextModels(),
    generate,
  };
}
