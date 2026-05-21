"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useUploadReferenceMutation } from "@/hooks/ai/playground-hook";
import { cn } from "@/lib/utils";
import type { GenerationControlNetKind } from "@/lib/validation/playground";
import { CONTROLNET_KINDS as KINDS } from "../playground-constants";

export type ControlNetValue = {
  kind: GenerationControlNetKind;
  imageUrl: string;
  weight: number;
};

type Props = {
  value: ControlNetValue | undefined;
  onChange: (next: ControlNetValue | undefined) => void;
};

export function ControlNetModal(props: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ControlNetValue["kind"]>(
    props.value?.kind ?? "depth",
  );
  const [imageUrl, setImageUrl] = useState<string>(props.value?.imageUrl ?? "");
  const [weight, setWeight] = useState<number>(props.value?.weight ?? 0.8);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const upload = useUploadReferenceMutation();

  // Reset scratch state when dialog opens so the user sees the current
  // committed value (not a half-edited previous open). Derived-state via
  // the prevOpen guard avoids the effect-as-sync anti-pattern.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setKind(props.value?.kind ?? "depth");
    setImageUrl(props.value?.imageUrl ?? "");
    setWeight(props.value?.weight ?? 0.8);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const onPickFile = async (file: File) => {
    const result = await upload.mutateAsync(file);
    setImageUrl(result.url);
  };

  const onApply = () => {
    if (!imageUrl) return;
    props.onChange({ kind, imageUrl, weight });
    setOpen(false);
  };

  const onRemove = () => {
    props.onChange(undefined);
    setImageUrl("");
  };

  const hasValue = !!props.value;

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">{t("IMAGE.CONTROLNET")}</span>
        <div className="flex gap-2">
          {hasValue && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemove}
            >
              <Icon name="trash" className="mr-1 h-4 w-4" />
              {t("IMAGE.DELETE")}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium">
              <Icon name="plus" className="mr-1 h-4 w-4" />
              {hasValue ? t("IMAGE.EDIT") : t("IMAGE.CONTROLNET_ADD")}
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("IMAGE.CONTROLNET_SELECT")}</DialogTitle>
                <DialogDescription>
                  {t("IMAGE.CONTROLNET_DESCRIPTION")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2 block">
                    {t("IMAGE.CONTROLNET_KIND")}
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {KINDS.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setKind(k.id)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-xs",
                          kind === k.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {t(k.i18nKey as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">
                    {t("IMAGE.CONTROLNET_REFERENCE_IMAGE")}
                  </Label>
                  {imageUrl ? (
                    <div className="bg-muted relative overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="ControlNet reference"
                        className="max-h-48 w-full object-contain"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2"
                      >
                        <Icon name="trash" className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={upload.isPending}
                      className="border-border hover:bg-accent flex h-32 w-full items-center justify-center rounded-md border border-dashed text-sm"
                    >
                      <Icon name="upload" className="mr-2 h-4 w-4" />
                      {upload.isPending
                        ? t("IMAGE.UPLOADING")
                        : t("IMAGE.UPLOAD_IMAGE")}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onPickFile(f);
                    }}
                  />
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                    <Label>{t("IMAGE.CONTROLNET_WEIGHT")}</Label>
                    <span className="tabular-nums">{weight.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0}
                    max={2}
                    step={0.05}
                    value={[weight]}
                    onValueChange={(v) =>
                      setWeight(Array.isArray(v) ? v[0] : v)
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("COMMON.CANCEL")}
                </Button>
                <Button type="button" onClick={onApply} disabled={!imageUrl}>
                  {t("IMAGE.CONTROLNET_APPLY")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {hasValue && (
        <div className="bg-muted/40 border-t px-3 py-2 text-xs">
          {t("IMAGE.CONTROLNET_ACTIVE", {
            kind: t(
              (KINDS.find((k) => k.id === props.value?.kind)?.i18nKey ??
                "") as Parameters<typeof t>[0],
            ),
            weight: props.value!.weight.toFixed(2),
          })}
        </div>
      )}
    </div>
  );
}
