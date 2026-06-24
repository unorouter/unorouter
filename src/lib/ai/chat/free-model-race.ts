// Injected so the file stays isomorphic: the server provides getProvider+generateText,
// the client custom path provides its own createOpenAICompatible-backed generate.
export type FreeModelGenerate = (
  modelName: string,
  opts: {
    systemPrompt: string;
    prompt: string;
    maxOutputTokens: number;
    abortSignal?: AbortSignal;
  },
) => Promise<{ text: string }>;

export type FreeModelRaceArgs = {
  systemPrompt: string;
  prompt: string;
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
  // Free text model names to race over (server: getFreeTextModels; client: pricing query / provider models).
  listFreeModels: () => Promise<string[]>;
  generate: FreeModelGenerate;
};

// Races every free text model via `Promise.any`. Throws if all fail or none free.
export async function freeModelRace(
  args: FreeModelRaceArgs,
): Promise<{ text: string; models: string[] }> {
  const models = await args.listFreeModels();
  if (models.length === 0) throw new Error("no free models available");

  const attempts = models.map((modelName) =>
    args.generate(modelName, {
      systemPrompt: args.systemPrompt,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
      abortSignal: args.abortSignal,
    }),
  );
  const result = await Promise.any(attempts);
  return { text: result.text, models };
}
