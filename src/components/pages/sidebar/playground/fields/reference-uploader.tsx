"use client";

import { Button } from "@/components/ui/button";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUploadReferenceMutation } from "@/hooks/playground-hook";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

export type ReferenceEntry = {
  url: string;
  name?: string;
  weight?: number;
};

const MAX_REFERENCES_DEFAULT = 6;
const ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  maxFiles?: number;
  value: ReferenceEntry[];
  onChange: (next: ReferenceEntry[]) => void;
};

export function ReferenceUploader(props: Props) {
  const t = useTranslations();
  const uploadMut = useUploadReferenceMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cap = props.maxFiles ?? MAX_REFERENCES_DEFAULT;
  const value = props.value;
  const remaining = cap - value.length;

  const uploadFiles = async (files: FileList | File[]) => {
    if (remaining <= 0) return;
    const valid = Array.from(files)
      .filter((f) => ACCEPTED_MIMES.includes(f.type))
      .slice(0, remaining);
    if (valid.length === 0) return;
    const next: ReferenceEntry[] = [...value];
    for (const file of valid) {
      try {
        const result = await uploadMut.mutateAsync(file);
        next.push({ url: result.url });
      } catch {
        // toast handled in the hook
      }
    }
    if (next.length !== value.length) props.onChange(next);
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
    e.target.value = "";
  };

  return (
    <FormItem>
      <FormLabel>
        {t("IMAGE.REFERENCES_TITLE")}
        <span className="text-muted-foreground ml-2 text-xs font-normal">
          {value.length}/{cap}
        </span>
      </FormLabel>

      {value.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((ref, i) => (
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
                onClick={() => props.onChange(value.filter((_, j) => j !== i))}
                className="bg-background/80 hover:bg-background absolute top-1 right-1 rounded-full p-1 transition-colors"
                title={t("IMAGE.DELETE")}
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

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
            <Icon name="loader" className="h-5 w-5 animate-spin" />
          ) : (
            <Icon name="upload" className="h-5 w-5" />
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
