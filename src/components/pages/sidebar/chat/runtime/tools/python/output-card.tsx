"use client";

import { DocumentFileCard } from "@/components/pages/sidebar/chat/runtime/tools/documents/document-card";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { rec } from "@/lib/utils/base";

function ImagePreview(props: { fileId: string; alt: string }) {
  const src = useMediaSrc(props.fileId);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
    <img
      src={src}
      alt={props.alt}
      className="mt-2 max-h-96 max-w-full rounded-lg border bg-white object-contain"
    />
  );
}

export function PythonOutputCard(props: { result: unknown }) {
  const files = rec(props.result)?.files;
  if (!Array.isArray(files)) return null;
  return (
    <>
      {files.map((f) => {
        const r = rec(f);
        const fileId = r?.fileId;
        const filename = r?.filename;
        if (typeof fileId !== "string" || typeof filename !== "string")
          return null;
        return (
          <div key={fileId}>
            {/\.(png|jpe?g|gif|webp)$/i.test(filename) && (
              <ImagePreview fileId={fileId} alt={filename} />
            )}
            <DocumentFileCard result={f} />
          </div>
        );
      })}
    </>
  );
}
