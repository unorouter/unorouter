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
