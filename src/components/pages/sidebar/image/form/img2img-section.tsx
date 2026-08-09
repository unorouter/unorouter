"use client";

import dynamic from "next/dynamic";
import type { ImageFormValues } from "@/lib/validation/image";
import { useFormContext, useWatch } from "react-hook-form";
import { InitImageField } from "../fields/init-image-field";
import { InpaintSettings } from "../fields/inpaint-settings";
import { useImageNav } from "../image-nav";
import { patchParams } from "./form-helpers";

// react-canvas-masker touches the DOM at module scope, so the canvas cannot render on
// the server and is only pulled in when the inpaint mode is actually opened.
const InpaintCanvas = dynamic(
  () => import("../fields/inpaint-canvas").then((m) => m.InpaintCanvas),
  { ssr: false },
);

// The init image + manual inpaint block; subscribes to its own param so an upload does
// not re-render the whole form.
export function Img2ImgSection() {
  const nav = useImageNav();
  const form = useFormContext<ImageFormValues>();
  const initImageUrl = useWatch({
    control: form.control,
    name: "params.initImageUrl",
  });

  if (nav.tab !== "img2img") return null;

  return (
    <>
      <InitImageField
        value={initImageUrl}
        onChange={(next) => patchParams(form, { initImageUrl: next })}
        onInpaint={
          nav.subPill === "inpaint"
            ? undefined
            : () => nav.setSubPill("inpaint")
        }
      />
      {nav.subPill === "inpaint" && typeof initImageUrl === "string" && (
        <>
          <InpaintCanvas imageUrl={initImageUrl} />
          <InpaintSettings />
        </>
      )}
    </>
  );
}
