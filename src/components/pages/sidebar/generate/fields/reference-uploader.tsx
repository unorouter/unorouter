"use client";

import { Button } from "@/components/ui/button";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUploadReferenceMutation } from "@/hooks/generation-hook";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { LuLoader, LuUpload, LuX } from "react-icons/lu";

// One reference entry as it lives on the form's `references` array.
// `url` is the R2 URL the new-api adapter will fetch + base64-encode +
// pre-upload to ComfyUI's input/ via input.images. `name` is advisory
// (for prompts that mention it); `weight` is unused by the stock
// ReferenceLatent node but reserved for future weighted variants.
export type ReferenceEntry = {
  url: string;
  name?: string;
  weight?: number;
};

const MAX_REFERENCES_DEFAULT = 6;
const ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  value: ReferenceEntry[];
  onChange: (next: ReferenceEntry[]) => void;
  // Per-model cap. Falls back to 6 (the TypeBox cap on `references[]`)
  // when the descriptor doesn't declare a value.
  maxFiles?: number;
};

export function ReferenceUploader(props: Props) {
  const t = useTranslations();
  const uploadMut = useUploadReferenceMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cap = props.maxFiles ?? MAX_REFERENCES_DEFAULT;
  const remaining = cap - props.value.length;

  const uploadFiles = async (files: FileList | File[]) => {
    if (remaining <= 0) return;
    const valid = Array.from(files)
      .filter((f) => ACCEPTED_MIMES.includes(f.type))
      .slice(0, remaining);
    if (valid.length === 0) return;

    // Upload sequentially to avoid request-rate spikes against R2 and
    // keep per-file errors scoped (a failed upload doesn't taint the
    // others). Only successful uploads land in the references array.
    const next: ReferenceEntry[] = [...props.value];
    for (const file of valid) {
      try {
        const result = await uploadMut.mutateAsync(file);
        next.push({ url: result.url });
      } catch {
        // handleError in the hook already shows a toast; just skip
      }
    }
    if (next.length !== props.value.length) {
      props.onChange(next);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
    // Reset so the same file can be re-picked after a remove
    e.target.value = "";
  };

  return (
    <FormItem>
      <FormLabel>
        {t("IMAGE.REFERENCES_TITLE")}
        <span className="text-muted-foreground ml-2 text-xs font-normal">
          {props.value.length}/{cap}
        </span>
      </FormLabel>

      {/* Existing references as thumbnail tiles */}
      {props.value.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {props.value.map((ref, i) => (
            <div
              key={`${ref.url}-${i}`}
              className="bg-muted relative aspect-square overflow-hidden rounded-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- R2 host varies, skip optimization */}
              <img
                src={ref.url}
                alt={ref.name ?? `ref ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  props.onChange(props.value.filter((_, j) => j !== i))
                }
                className="bg-background/80 hover:bg-background absolute top-1 right-1 rounded-full p-1 transition-colors"
                title={t("IMAGE.DELETE")}
              >
                <LuX className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone + browse button - hidden when at the cap */}
      {remaining > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm transition-colors ${
            isDragging
              ? "border-primary bg-accent"
              : "border-muted-foreground/30"
          }`}
        >
          {uploadMut.isPending ? (
            <LuLoader className="h-5 w-5 animate-spin" />
          ) : (
            <LuUpload className="h-5 w-5" />
          )}
          <p className="text-muted-foreground text-xs">
            {t("IMAGE.REFERENCES_DROP_HINT")}
          </p>
          <Input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_MIMES.join(",")}
            onChange={onPick}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            {t("IMAGE.REFERENCES_ADD")}
          </Button>
        </div>
      )}
    </FormItem>
  );
}
