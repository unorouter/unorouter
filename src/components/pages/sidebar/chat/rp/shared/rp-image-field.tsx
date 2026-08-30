"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import type { TranslationKey } from "@/lib/config/constants";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { uid } from "@/lib/utils/base";
import { fileToScaledDataUrl, splitDataUrl } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export type ImgDraft =
  { kind: "keep" } | { kind: "remove" } | { kind: "new"; dataUrl: string };

// Minting a new media id on every replace leaves the previous row orphaned.
// Long-standing behavior, kept as is: deleting here would break an avatar that
// another entity still points at, since nothing tracks media references.
export async function resolveMediaId(
  draft: ImgDraft,
  existingId: string | null | undefined,
): Promise<string | null> {
  if (draft.kind === "remove") return null;
  if (draft.kind === "keep") return existingId ?? null;
  const parts = splitDataUrl(draft.dataUrl);
  if (!parts) return existingId ?? null;
  const mediaId = uid();
  await upsertLocalMedia({
    id: mediaId,
    convId: null,
    mimeType: parts.mimeType,
    sizeBytes: Math.floor((parts.base64.length * 3) / 4),
    dataBase64: parts.base64,
  });
  return mediaId;
}

export function RpImageField(props: {
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  preview: string | null;
  onPick: (draft: ImgDraft) => void;
  shape: "circle" | "banner";
}) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
      <div className="text-foreground text-xs font-medium tracking-wide uppercase">
        {t(props.labelKey)}
      </div>
      <p className="text-muted-foreground text-xs">{t(props.hintKey)}</p>
      {props.preview && (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={t("COMMON.PREVIEW")}
          className={`border-border/40 relative cursor-zoom-in overflow-hidden border ${
            props.shape === "circle"
              ? "size-24 rounded-full"
              : "h-28 w-full rounded-lg"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, next/image can't optimize it */}
          <img
            src={props.preview}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
      )}

      {/* The thumbnail is cropped to a circle or a banner, so it is the only
          place the full image can actually be checked after upload. */}
      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-3xl" showCloseButton>
          <DialogHeader className="sr-only">
            <DialogTitle>{t(props.labelKey)}</DialogTitle>
          </DialogHeader>
          {props.preview && (
            // eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, next/image can't optimize it
            <img
              src={props.preview}
              alt=""
              className="max-h-[80svh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="upload" className="mr-1.5 size-3.5" />
          {props.preview ? t("THEME.BG_REPLACE") : t("THEME.BG_UPLOAD")}
        </Button>
        {props.preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => props.onPick({ kind: "remove" })}
          >
            <Icon name="trash-2" className="mr-1.5 size-3.5" />
            {t("THEME.BG_REMOVE")}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) {
            props.onPick({
              kind: "new",
              dataUrl: await fileToScaledDataUrl(file),
            });
          }
        }}
      />
    </div>
  );
}
