"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  extractMetadataFromPngFile,
  type RestoredFromPng,
} from "@/components/pages/sidebar/playground/utils/png-metadata";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

// Positioned above the model picker: the imported model hint must apply before the form re-renders with model-specific controls.
type Props = {
  onImport: (data: RestoredFromPng) => void;
};

export function PngImport(props: Props) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    try {
      const data = await extractMetadataFromPngFile(file);
      if (!data || Object.keys(data).length === 0) {
        setError(t("IMAGE.PNG_IMPORT_NO_METADATA"));
        return;
      }
      props.onImport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "parse error");
    } finally {
      setIsParsing(false);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "image/png") {
      await handleFile(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`flex items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm transition-colors ${
        isDragging ? "border-primary bg-accent" : "border-muted-foreground/30"
      }`}
    >
      <div className="flex items-center gap-2">
        {isParsing ? (
          <Icon name="loader" className="h-4 w-4 animate-spin" />
        ) : (
          <Icon name="image-down" className="h-4 w-4" />
        )}
        <span className="text-muted-foreground text-xs">
          {error ?? t("IMAGE.PNG_IMPORT_HINT")}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isParsing}
        onClick={() => inputRef.current?.click()}
      >
        {t("IMAGE.PNG_IMPORT_BROWSE")}
      </Button>
    </div>
  );
}
