import { Type as t, type Static } from "@sinclair/typebox/type";

export const VOICE_READ_MODES = ["all", "dialogue", "split"] as const;
export const voiceReadMode = t.Union(VOICE_READ_MODES.map((m) => t.Literal(m)));
export type VoiceReadMode = Static<typeof voiceReadMode>;

// s2.1-pro-free is the only one a key without credit can call; the others 402.
export const FISH_MODELS = ["s2.1-pro-free", "s2.1-pro", "s1"] as const;
export const DEFAULT_FISH_MODEL = FISH_MODELS[0];

export const MAX_TTS_TEXT = 5_000;
const voiceRef = t.String({ pattern: "^[a-f0-9]{32}$" });

export const voiceSettingsForm = t.Object({
  apiKey: t.String({ maxLength: 200, default: "" }),
  model: t.String({ maxLength: 64, default: DEFAULT_FISH_MODEL }),
  voiceId: t.String({ maxLength: 32, default: "" }),
  narratorVoiceId: t.String({ maxLength: 32, default: "" }),
  readMode: t.Union(
    VOICE_READ_MODES.map((m) => t.Literal(m)),
    { default: "all" },
  ),
  speed: t.Number({ minimum: 0.5, maximum: 2, default: 1 }),
  volume: t.Number({ minimum: -20, maximum: 20, default: 0 }),
  autoplay: t.Boolean({ default: false }),
});
export type VoiceSettingsForm = Static<typeof voiceSettingsForm>;

export const fishTtsBody = t.Object({
  text: t.String({ minLength: 1, maxLength: MAX_TTS_TEXT }),
  model: t.Union(FISH_MODELS.map((m) => t.Literal(m))),
  referenceIds: t.Array(voiceRef, { maxItems: 8 }),
  speed: t.Number({ minimum: 0.5, maximum: 2 }),
  volume: t.Number({ minimum: -20, maximum: 20 }),
});
export type FishTtsBody = Static<typeof fishTtsBody>;

export const fishVoiceSearchQuery = t.Object({
  q: t.Optional(t.String({ maxLength: 100 })),
});

export type FishVoice = {
  id: string;
  title: string;
  languages: string[];
  tags: string[];
};
