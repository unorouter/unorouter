"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { handleError } from "@/lib/utils/client";
import { Icon } from "@/components/ui/icon";
import { SmartImage } from "@/components/ui/smart-image";
import { ACCEPTED_IMAGE_MIMES, fileToScaledDataUri } from "./client-image-file";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  /** Absent while already inpainting, since the mask canvas is the thing below. */
  onInpaint?: () => void;
};

export function InitImageField(props: Props) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isReading, setIsReading] = useState(false);

  const value = props.value;
  const onPick = async (file: File) => {
    setIsReading(true);
    try {
      props.onChange(await fileToScaledDataUri(file));
    } catch (e) {
      await handleError(e, t);
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div>
      <Label className="mb-2 block">{t("IMAGE.INIT_IMAGE")}</Label>
      {value ? (
        <div className="bg-muted relative overflow-hidden rounded-md">
          <SmartImage
            src={value}
            alt="Init image"
            width={0}
            height={0}
            sizes="100vw"
            className="h-auto max-h-64 w-full object-contain"
          />
          {/* Same affordance an uploaded image gets as a generated one: the paintbrush is
              how users already reach the mask, so it has to be here too rather than only on
              results. */}
          <div className="absolute top-2 right-2 flex gap-2">
            {props.onInpaint && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={props.onInpaint}
                title={t("IMAGE.HOVER_INPAINT")}
                aria-label={t("IMAGE.HOVER_INPAINT")}
              >
                <Icon name="paintbrush" className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => props.onChange(undefined)}
              aria-label={t("COMMON.DELETE")}
            >
              <Icon name="trash" className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isReading}
          className="border-border hover:bg-accent flex h-32 w-full items-center justify-center rounded-md border border-dashed text-sm"
        >
          <Icon name="upload" className="mr-2 h-4 w-4" />
          {isReading ? t("IMAGE.UPLOADING") : t("IMAGE.UPLOAD_IMAGE")}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_MIMES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
