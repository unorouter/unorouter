// In-chat image gen (post_processing). A second LLM with its own instruction writes an image prompt from
// ONLY the latest response, then runtime.generateImage produces the inlay. The written prompt rides the
// result for a verify-UI (not shown inline).

import type {
  AgentContext,
  AgentDefinition,
  AgentResult,
  AgentRuntime,
  AgentSettings,
} from "../../types";

const DEFAULT_INSTRUCTION =
  "You write image-generation prompts. Given the latest roleplay response, write a single concise, " +
  "vivid image prompt describing the current scene (subjects, setting, lighting, mood, composition). " +
  "Output ONLY the prompt text, no preamble, no quotes.";

type IllustratorSettings = {
  imageEnabled?: boolean | null;
  promptInstruction?: string;
  promptMaxTokens?: number;
};

export const illustratorAgent: AgentDefinition = {
  id: "illustrator",
  phase: "post_processing",
  capabilities: ["generate_image"],
  enabled(ctx: AgentContext, settings: AgentSettings) {
    const s = settings as IllustratorSettings;
    return !!s.imageEnabled && !!ctx.mainResponse?.trim();
  },
  async run(
    ctx: AgentContext,
    runtime: AgentRuntime,
    settings: AgentSettings,
  ): Promise<AgentResult> {
    if (!runtime.generateImage || !ctx.mainResponse) return { type: "noop" };
    const s = settings as IllustratorSettings;

    // Step 1: the prompt-writer (utility model) writes an image prompt from ONLY the latest response.
    let imgPrompt: string;
    try {
      const result = await runtime.generate(ctx.model, {
        systemPrompt: s.promptInstruction ?? DEFAULT_INSTRUCTION,
        prompt: ctx.mainResponse,
        maxOutputTokens: s.promptMaxTokens ?? 200,
      });
      imgPrompt = result.text.trim();
    } catch {
      return { type: "noop" };
    }
    if (!imgPrompt) return { type: "noop" };

    const media = await runtime.generateImage(imgPrompt);
    if (!media) return { type: "noop" };
    return {
      type: "inlay_image",
      media,
      token: `{{inlay::${media.id}}}`,
      prompt: imgPrompt,
    };
  },
};
