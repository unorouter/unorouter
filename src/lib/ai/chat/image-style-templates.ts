import { msg, type TranslationKey } from "@/lib/config/constants";

export type ImageStyleTemplate = {
  id: string;
  labelKey: TranslationKey;
  instruction: string;
};

const BASE =
  "You write image-generation prompts. Given the latest roleplay response, write a single concise, " +
  "vivid image prompt describing the current scene (subjects, setting, lighting, mood, composition). ";

const OUTPUT = " Output ONLY the prompt text, no preamble, no quotes.";

export const IMAGE_STYLE_TEMPLATES: ImageStyleTemplate[] = [
  {
    id: "anime",
    labelKey: msg("CHAT.IMAGE_STYLE.ANIME"),
    instruction:
      BASE +
      "Style: anime illustration with clean character design, expressive detailed eyes, crisp lineart, " +
      "polished lighting, best quality. Avoid photorealism, 3d render, text, watermarks." +
      OUTPUT,
  },
  {
    id: "danbooru",
    labelKey: msg("CHAT.IMAGE_STYLE.DANBOORU"),
    instruction:
      "You write image-generation prompts for Danbooru-tag models (SDXL, Illustrious, Pony, NovelAI). " +
      "Given the latest roleplay response, write one comma-separated booru tag prompt for the current scene. " +
      "Start with: masterpiece, best quality, absurdres. Then subject count, character traits, pose, " +
      "expression, clothing, setting, lighting, composition tags." +
      OUTPUT,
  },
  {
    id: "realistic",
    labelKey: msg("CHAT.IMAGE_STYLE.REALISTIC"),
    instruction:
      BASE +
      "Style: realistic SDXL rendering with natural lighting, believable materials, lens-aware " +
      "composition, sharp detail." +
      OUTPUT,
  },
  {
    id: "photorealistic",
    labelKey: msg("CHAT.IMAGE_STYLE.PHOTOREALISTIC"),
    instruction:
      BASE +
      "Style: photorealistic photograph with believable skin and materials, real camera framing " +
      "(name a lens and aperture), natural light, no illustration look." +
      OUTPUT,
  },
  {
    id: "cinematic",
    labelKey: msg("CHAT.IMAGE_STYLE.CINEMATIC"),
    instruction:
      BASE +
      "Style: cinematic film still with dramatic lighting, deliberate color grade, subtle film grain, " +
      "wide dynamic range, strong composition." +
      OUTPUT,
  },
];
