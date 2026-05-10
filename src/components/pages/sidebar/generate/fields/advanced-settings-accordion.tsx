"use client";

// SDXL-family-only Advanced Settings accordion. Exposes the two
// power-user knobs that tensor.art hides behind its identical-named
// accordion: Clip Skip and ENSD (Eta Noise Seed Delta). Both route into
// the KSampler/CLIPSkip node pair in the ComfyUI template; non-SDXL
// model templates ignore them.

import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Props = {
  clipSkip: number | undefined;
  ensd: number | undefined;
  onChange: (next: { clipSkip?: number; ensd?: number }) => void;
};

export function AdvancedSettingsAccordion(props: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const clipSkip = props.clipSkip ?? 2;
  const ensd = props.ensd ?? 31337;

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        {open ? (
          <LuChevronDown className="h-4 w-4" />
        ) : (
          <LuChevronRight className="h-4 w-4" />
        )}
        {t("IMAGE.ADVANCED_SETTINGS")}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t p-3">
          <div>
            <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
              <Label>{t("IMAGE.CLIP_SKIP")}</Label>
              <span className="tabular-nums">{clipSkip}</span>
            </div>
            <Slider
              min={0}
              max={12}
              step={1}
              value={[clipSkip]}
              onValueChange={(v) =>
                props.onChange({
                  clipSkip: Array.isArray(v) ? v[0] : v,
                })
              }
            />
          </div>
          <div>
            <Label className="mb-1 block">{t("IMAGE.ENSD")}</Label>
            <Input
              type="number"
              value={ensd}
              onChange={(e) =>
                props.onChange({
                  ensd: Number(e.target.value) || undefined,
                })
              }
              min={0}
              max={4_294_967_295}
            />
          </div>
        </div>
      )}
    </div>
  );
}
