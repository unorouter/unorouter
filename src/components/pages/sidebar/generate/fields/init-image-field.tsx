"use client";

// Init image upload for the Img2Img / Upscale / ADetailer / Inpaint
// sub-pills. Uploads a PNG/JPG/WebP to R2 via /api/generation/references
// and writes the returned URL to params.initImageUrl. Inpaint then mounts
// its brush canvas on top of this image; Upscale + ADetailer feed it
// straight into the worker's LoadImage node.

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { LuTrash, LuUpload } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUploadReferenceMutation } from "@/hooks/generation-hook";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
};

export function InitImageField(props: Props) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const upload = useUploadReferenceMutation();

  const onPick = async (file: File) => {
    const result = await upload.mutateAsync(file);
    props.onChange(result.url);
  };

  return (
    <div>
      <Label className="mb-2 block">{t("IMAGE.INIT_IMAGE")}</Label>
      {props.value ? (
        <div className="bg-muted relative overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.value}
            alt="Init image"
            className="max-h-64 w-full object-contain"
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => props.onChange(undefined)}
            className="absolute top-2 right-2"
          >
            <LuTrash className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="border-border hover:bg-accent flex h-32 w-full items-center justify-center rounded-md border border-dashed text-sm"
        >
          <LuUpload className="mr-2 h-4 w-4" />
          {upload.isPending ? t("IMAGE.UPLOADING") : t("IMAGE.UPLOAD_IMAGE")}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
        }}
      />
    </div>
  );
}
