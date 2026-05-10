"use client";

// Prompt encoder mode picker. Mirrors tensor.art's A1111 / Ella
// checkboxes, but represents them as one radio with three options because
// they're semantically mutually exclusive on the worker:
//   - default: the model's stock CLIP tokenization
//   - a1111:   A1111-style `(token:1.2)` weight syntax via smZ nodes
//   - ella:    routes through the Ella T5 encoder for long prompts
//             (only available on checkpoints with an Ella adapter on the
//              network volume)
//
// The form keeps params.promptEncoder undefined for "default" so legacy
// snapshots without the field don't show a stale selection.

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Encoder = "default" | "a1111" | "ella";

type Props = {
  value: Encoder | undefined;
  onChange: (next: Encoder | undefined) => void;
};

const CHOICES: ReadonlyArray<{ id: Encoder; i18nKey: string }> = [
  { id: "default", i18nKey: "IMAGE.PROMPT_ENCODER_DEFAULT" },
  { id: "a1111", i18nKey: "IMAGE.PROMPT_ENCODER_A1111" },
  { id: "ella", i18nKey: "IMAGE.PROMPT_ENCODER_ELLA" },
];

export function PromptEncoderField(props: Props) {
  const t = useTranslations();
  const active = props.value ?? "default";

  return (
    <div>
      <Label className="mb-2 block">{t("IMAGE.PROMPT_ENCODER")}</Label>
      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              props.onChange(c.id === "default" ? undefined : c.id)
            }
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs",
              active === c.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(c.i18nKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
