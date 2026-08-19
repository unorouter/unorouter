"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { TranslationKey } from "@/lib/types";

export const TOKENIZER_OPTIONS: { value: string; labelKey: TranslationKey }[] =
  [
    { value: "auto", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_AUTO" },
    { value: "cl100k", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_CL100K" },
    { value: "o200k", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_O200K" },
    { value: "claude", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_CLAUDE" },
    { value: "glm5", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GLM5" },
    { value: "glm4", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GLM4" },
    { value: "deepseek", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_DEEPSEEK" },
    {
      value: "deepseek-v4",
      labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_DEEPSEEK_V4",
    },
    { value: "llama3", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_LLAMA3" },
    { value: "gemma", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_GEMMA" },
    { value: "qwen", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_QWEN" },
    { value: "mistral", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_MISTRAL" },
    { value: "cohere", labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_COHERE" },
    {
      value: "hf-custom",
      labelKey: "CHAT.CUSTOM_PROVIDER.TOKENIZER_HF_CUSTOM",
    },
  ];

// `hf:<slug>` is stored as one string, so the select shows a sentinel and the slug
// gets its own input. Empty means "auto".
export function TokenizerSelect(props: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useTranslations();
  const stored = props.value || "auto";
  const isHf = stored.startsWith("hf:");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="border-input bg-background h-8 rounded-md border px-2 text-xs"
        value={isHf ? "hf-custom" : stored}
        onChange={(e) =>
          props.onChange(
            e.target.value === "hf-custom" ? "hf:" : e.target.value,
          )
        }
      >
        {TOKENIZER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
      {isHf && (
        <Input
          className="min-w-40 flex-1 font-mono text-xs"
          placeholder={t("CHAT.CUSTOM_PROVIDER.TOKENIZER_HF_PLACEHOLDER")}
          value={stored.slice(3)}
          onChange={(e) => props.onChange(`hf:${e.target.value}`)}
        />
      )}
    </div>
  );
}
