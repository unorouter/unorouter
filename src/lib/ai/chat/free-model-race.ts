export type FreeModelGenerate = (
  modelName: string,
  opts: {
    systemPrompt: string;
    prompt: string;
    maxOutputTokens: number;
    abortSignal?: AbortSignal;
    // Provider lane for THIS call. Per-call rather than baked into the deps,
    // because one generate is reused across a race whose models do not share
    // lanes, so a lane pinned for one of them is wrong for the rest.
    group?: string | null;
  },
) => Promise<{ text: string }>;

export type FreeModelRaceArgs = {
  systemPrompt: string;
  prompt: string;
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
  listFreeModels: () => Promise<string[]>;
  generate: FreeModelGenerate;
};

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
