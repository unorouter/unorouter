"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { Picker } from "@/components/ui/theme/picker";
import type { BackgroundSettings } from "@/components/ui/theme/theme-store";
import { fileToScaledDataUrl } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

export function BackgroundImageSection(props: {
  image: string | null;
  setImage: (next: string | null) => void;
  background: BackgroundSettings | undefined;
  onChange: (patch: Partial<BackgroundSettings>) => void;
}) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    try {
      props.setImage(await fileToScaledDataUrl(file));
      props.onChange({ enabled: true });
    } catch {
      toast.error(t("THEME.IMPORT_FAILED"));
    }
  };

  const fit = props.background?.fit ?? "cover";

  return (
    <>
      <div className="text-muted-foreground px-1 pt-1 text-xs">
        {t("THEME.BACKGROUND_IMAGE")}
      </div>
      {props.image ? (
        <div className="flex flex-col gap-2.5">
          <div className="ring-foreground/10 relative h-24 w-full overflow-hidden rounded-lg ring-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, next/image can't optimize it */}
            <img
              src={props.image}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" className="mr-1.5 size-3.5" />
              {t("THEME.BG_REPLACE")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => props.setImage(null)}
            >
              <Icon name="trash-2" className="mr-1.5 size-3.5" />
              {t("THEME.BG_REMOVE")}
            </Button>
          </div>
          <Picker
            label={t("THEME.BG_FIT")}
            value={fit}
            valueLabel={
              fit === "contain"
                ? t("THEME.BG_FIT_CONTAIN")
                : fit === "tile"
                  ? t("THEME.BG_FIT_TILE")
                  : t("THEME.BG_FIT_COVER")
            }
            options={[
              { value: "cover", label: t("THEME.BG_FIT_COVER") },
              { value: "contain", label: t("THEME.BG_FIT_CONTAIN") },
              { value: "tile", label: t("THEME.BG_FIT_TILE") },
            ]}
            onValueChange={(v) =>
              props.onChange({
                fit: v === "contain" || v === "tile" ? v : "cover",
              })
            }
          />
          <div className="flex flex-col gap-1.5 px-1">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{t("THEME.BG_OPACITY")}</span>
              <span>{Math.round((props.background?.opacity ?? 1) * 100)}%</span>
            </div>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={props.background?.opacity ?? 1}
              onValueChange={(v) =>
                props.onChange({ opacity: Array.isArray(v) ? v[0] : v })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5 px-1">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{t("THEME.BG_BLUR")}</span>
              <span>{props.background?.blur ?? 0}px</span>
            </div>
            <Slider
              min={0}
              max={24}
              step={1}
              value={props.background?.blur ?? 0}
              onValueChange={(v) =>
                props.onChange({ blur: Array.isArray(v) ? v[0] : v })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5 px-1">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{t("THEME.BG_PANEL_OPACITY")}</span>
              <span>
                {Math.round((props.background?.panelOpacity ?? 0.75) * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={props.background?.panelOpacity ?? 0.75}
              onValueChange={(v) =>
                props.onChange({ panelOpacity: Array.isArray(v) ? v[0] : v })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5 px-1">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{t("THEME.BG_BUBBLE_OPACITY")}</span>
              <span>
                {Math.round(
                  (props.background?.bubbleOpacity ??
                    props.background?.panelOpacity ??
                    0.75) * 100,
                )}
                %
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={
                props.background?.bubbleOpacity ??
                props.background?.panelOpacity ??
                0.75
              }
              onValueChange={(v) =>
                props.onChange({ bubbleOpacity: Array.isArray(v) ? v[0] : v })
              }
            />
            <p className="text-muted-foreground text-[11px]">
              {t("THEME.BG_BUBBLE_OPACITY_HINT")}
            </p>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" className="mr-1.5 size-3.5" />
          {t("THEME.BG_UPLOAD")}
        </Button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
