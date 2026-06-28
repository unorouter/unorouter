import type { ProviderConfig } from "./providers/config";
import {
  cjkLeak,
  hasCodingToolRefusal,
  hasForeignIdentity,
  hasScamPage,
  includesAny,
} from "./signals";
import { CLOUD_HOST_PATTERNS, FAKE_RESPONSE_SIGNATURES } from "./patterns";
import { nonceTag } from "./nonce";
import type { ProbeLabel } from "./types";

export type ProbeDef = {
  label: ProbeLabel;
  maxTokens: number;
  buildPrompt: (nonce: string) => string;
  evaluate: (text: string, cfg: ProviderConfig) => boolean;
};

export function buildProbes(): ProbeDef[] {
  return [
    {
      label: "emotional",
      maxTokens: 200,
      buildPrompt: (n) =>
        `Tell me a 2-sentence sad story about a lost kitten. ${nonceTag(n)}`,
      evaluate: (text) =>
        !hasCodingToolRefusal(text) && !cjkLeak(text) && text.length >= 40,
    },
    {
      label: "creative",
      maxTokens: 120,
      buildPrompt: (n) =>
        `Write a haiku about the ocean at sunrise. ${nonceTag(n)}`,
      evaluate: (text) =>
        !hasCodingToolRefusal(text) && !cjkLeak(text) && text.length >= 25,
    },
    {
      label: "identity",
      maxTokens: 60,
      buildPrompt: (n) =>
        "Which AI lab developed and trained the model you are running on? " +
        "Not the company hosting you, the lab that trained the model. " +
        `One word answer. ${nonceTag(n)}`,
      evaluate: (text, cfg) => {
        if (hasCodingToolRefusal(text) || hasScamPage(text)) return false;
        if (
          hasForeignIdentity(
            text,
            cfg.foreignIdentityPatterns,
            cfg.cloudModelNamePatterns,
            "identity",
          )
        )
          return false;
        if (includesAny(text, cfg.homeIdentityPatterns)) return true;
        if (
          cfg.acceptsCloudHostIdentity &&
          includesAny(text, CLOUD_HOST_PATTERNS)
        )
          return true;
        return false;
      },
    },
    {
      label: "model-name",
      maxTokens: 80,
      buildPrompt: (n) =>
        `Which model are you? Reply with only your model name. ${nonceTag(n)}`,
      evaluate: (text, cfg) => {
        if (hasCodingToolRefusal(text) || hasScamPage(text)) return false;
        if (
          hasForeignIdentity(
            text,
            cfg.foreignIdentityPatterns,
            cfg.cloudModelNamePatterns,
            "model-name",
          )
        )
          return false;
        if (!includesAny(text, cfg.homeModelNamePatterns)) return false;
        const stripped = text.replace(/^\s*\[[a-z0-9]{4,8}\]\s*/i, "").trim();
        if (FAKE_RESPONSE_SIGNATURES.includes(stripped)) return false;
        return true;
      },
    },
  ];
}
