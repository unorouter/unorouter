import type {
  FreeModelGenerate,
  FreeModelRaceArgs,
} from "@/lib/ai/chat/free-model-race";
import { UTILITY_RACE_MODELS } from "@/lib/config/constants";
import { getProvider } from "@/server/constants";
import { generateText } from "ai";

export function serverFreeModelRaceDeps(
  apiKey: string,
  group?: string | null,
): Pick<FreeModelRaceArgs, "listFreeModels" | "generate"> {
  const provider = getProvider(apiKey, undefined, group);
  const generate: FreeModelGenerate = (modelName, opts) =>
    generateText({
      model: provider.chatModel(modelName),
      system: opts.systemPrompt,
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 0,
      ...(opts.abortSignal ? { abortSignal: opts.abortSignal } : {}),
    });
  // A fixed trio, not the live free-model list: the race fires every model it
  // is given concurrently, so feeding it the whole catalog meant ~172 upstream
  // requests per title/classification.
  return {
    listFreeModels: async () => [...UTILITY_RACE_MODELS],
    generate,
  };
}
