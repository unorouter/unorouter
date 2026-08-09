"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { GenerationFormValues } from "@/lib/validation/playground";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { patchParams } from "./form-helpers";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

function bytesEqual(a: Uint8Array, b: readonly number[], offset = 0): boolean {
  for (let i = 0; i < b.length; i++) {
    if (a[offset + i] !== b[i]) return false;
  }
  return true;
}

function readPngTextChunks(buffer: ArrayBuffer): Record<string, string> | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8 || !bytesEqual(bytes, PNG_SIGNATURE)) return null;

  const view = new DataView(buffer);
  const decoder = new TextDecoder("latin1");
  const out: Record<string, string> = {};

  let cursor = 8;
  while (cursor + 8 <= bytes.length) {
    const dataLength = view.getUint32(cursor, false);
    const type = decoder.decode(bytes.slice(cursor + 4, cursor + 8));
    const dataStart = cursor + 8;
    const dataEnd = dataStart + dataLength;
    if (dataEnd + 4 > bytes.length) break;

    if (type === "tEXt") {
      const data = bytes.slice(dataStart, dataEnd);
      const nullIdx = data.indexOf(0);
      if (nullIdx > 0) {
        const keyword = decoder.decode(data.slice(0, nullIdx));
        out[keyword] = decoder.decode(data.slice(nullIdx + 1));
      }
    }

    if (type === "IEND") break;

    cursor = dataEnd + 4;
  }

  return out;
}

type RestoredFromPng = {
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  guidance?: number;
  sampler?: string;
  scheduler?: string;
  width?: number;
  height?: number;
};

type ComfyNode = {
  class_type?: string;
  inputs?: Record<string, unknown>;
};

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function extractFromComfyGraph(graph: unknown): RestoredFromPng {
  if (!graph || typeof graph !== "object") return {};
  const g = graph as Record<string, ComfyNode>;
  const out: RestoredFromPng = {};
  const textEncodes: string[] = [];

  for (const node of Object.values(g)) {
    if (!node || typeof node !== "object") continue;
    const cls = node.class_type;
    const inputs = node.inputs ?? {};

    if (cls === "CLIPTextEncode") {
      const text = asString(inputs.text);
      if (text) textEncodes.push(text);
    } else if (cls === "KSampler") {
      out.seed ??= asNumber(inputs.seed);
      out.steps ??= asNumber(inputs.steps);
      out.cfg ??= asNumber(inputs.cfg);
      out.sampler ??= asString(inputs.sampler_name);
      out.scheduler ??= asString(inputs.scheduler);
    } else if (cls === "RandomNoise") {
      out.seed ??= asNumber(inputs.noise_seed);
    } else if (cls === "FluxGuidance") {
      out.guidance ??= asNumber(inputs.guidance);
    } else if (cls === "Flux2Scheduler") {
      out.steps ??= asNumber(inputs.steps);
      out.width ??= asNumber(inputs.width);
      out.height ??= asNumber(inputs.height);
    } else if (cls === "EmptyLatentImage" || cls === "EmptyFlux2LatentImage") {
      out.width ??= asNumber(inputs.width);
      out.height ??= asNumber(inputs.height);
    } else if (cls === "KSamplerSelect") {
      out.sampler ??= asString(inputs.sampler_name);
    }
  }

  if (textEncodes.length > 0) out.prompt = textEncodes[0];
  if (textEncodes.length > 1) out.negativePrompt = textEncodes[1];

  return out;
}

async function extractMetadataFromPngFile(
  file: File,
): Promise<RestoredFromPng | null> {
  const chunks = readPngTextChunks(await file.arrayBuffer());
  if (!chunks) return null;

  const promptChunk = chunks.prompt ?? chunks.workflow;
  if (!promptChunk) return null;

  try {
    return extractFromComfyGraph(JSON.parse(promptChunk));
  } catch {
    return null;
  }
}

// Drop a ComfyUI PNG to restore the prompt and params it was generated with.
export function PngImport() {
  const t = useTranslations();
  const form = useFormContext<GenerationFormValues>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyToForm = (data: RestoredFromPng) => {
    if (data.prompt !== undefined) {
      form.setValue("prompt", data.prompt, { shouldDirty: true });
    }
    if (data.negativePrompt !== undefined) {
      form.setValue("negativePrompt", data.negativePrompt, {
        shouldDirty: true,
      });
    }
    const paramData = { ...data };
    delete paramData.prompt;
    delete paramData.negativePrompt;
    patchParams(
      form,
      Object.fromEntries(
        Object.entries(paramData).filter(([, v]) => v !== undefined),
      ),
    );
  };

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    try {
      const data = await extractMetadataFromPngFile(file);
      if (!data || Object.keys(data).length === 0) {
        setError(t("IMAGE.PNG_IMPORT_NO_METADATA"));
        return;
      }
      applyToForm(data);
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
