"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  MaskEditor,
  toMask,
  type MaskEditorCanvasRef,
} from "react-canvas-masker";
import "react-canvas-masker/dist/style.css";
import { Button } from "@/components/ui/button";
import type { ImageFormValues } from "@/lib/validation/image";
import { LabeledSlider } from "./labeled-slider";

const DEFAULT_BRUSH = 32;
const DEFAULT_OPACITY = 0.6;

type Props = {
  imageUrl: string;
};

export function InpaintCanvas(props: Props) {
  const t = useTranslations();
  const form = useFormContext<ImageFormValues>();
  const editorRef = useRef<MaskEditorCanvasRef | null>(null);

  // The editor's own viewport is a fixed 300px-tall box and it scales the canvas to
  // fit, so a portrait render paints at ~200px wide. Size the box to the source
  // image's aspect ratio (capped to the viewport) so the paint surface fills the
  // column and the whole image stays reachable.
  const [aspect, setAspect] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const probe = new Image();
    probe.onload = () => {
      if (alive && probe.naturalWidth && probe.naturalHeight) {
        setAspect(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.src = props.imageUrl;
    return () => {
      alive = false;
    };
  }, [props.imageUrl]);

  const brushSize = form.watch("ui.inpaintBrushSize") ?? DEFAULT_BRUSH;
  const opacity = form.watch("ui.inpaintBrushOpacity") ?? DEFAULT_OPACITY;

  const setMask = (value: string | undefined) =>
    form.setValue("ui.inpaintMaskDataUrl", value, { shouldDirty: true });

  // The canvas owns the stroke history; read it back after every operation so the
  // submitted mask matches the screen (empty canvas = no mask, not an all-black one).
  // The canvas is unsized until the source image loads, and toMask throws
  // IndexSizeError on a zero dimension, so every path guards here.
  const syncMaskFromCanvas = () => {
    const canvas = editorRef.current?.maskCanvas;
    if (!canvas || !canvas.width || !canvas.height) {
      setMask(undefined);
      return;
    }
    try {
      setMask(toMask(canvas));
    } catch {
      setMask(undefined);
    }
  };

  const onDrawingChange = (isDrawing: boolean) => {
    if (isDrawing) return;
    syncMaskFromCanvas();
  };

  return (
    <Controller
      control={form.control}
      name="ui.inpaintMaskDataUrl"
      render={() => (
        <div className="flex flex-col gap-3">
          <div
            className="relative mx-auto max-h-[70vh] w-full overflow-hidden rounded-md border"
            style={aspect ? { aspectRatio: aspect } : { height: 300 }}
          >
            <MaskEditor
              src={props.imageUrl}
              canvasRef={editorRef as React.RefObject<MaskEditorCanvasRef>}
              cursorSize={brushSize}
              maskOpacity={opacity}
              maskColor="#ffffff"
              maskBlendMode="normal"
              onCursorSizeChange={(size) =>
                form.setValue("ui.inpaintBrushSize", size, {
                  shouldDirty: true,
                })
              }
              onDrawingChange={onDrawingChange}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabeledSlider
              label={t("IMAGE.INPAINT_BRUSH_SIZE")}
              min={4}
              max={128}
              step={2}
              value={brushSize}
              onChange={(v) =>
                form.setValue("ui.inpaintBrushSize", v, { shouldDirty: true })
              }
              format={(v) => `${v}px`}
            />
            <LabeledSlider
              label={t("IMAGE.INPAINT_BRUSH_OPACITY")}
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(v) =>
                form.setValue("ui.inpaintBrushOpacity", v, {
                  shouldDirty: true,
                })
              }
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                editorRef.current?.undo();
                syncMaskFromCanvas();
              }}
            >
              <Icon name="rotate-ccw" className="mr-1 h-4 w-4" />
              {t("IMAGE.INPAINT_UNDO")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                editorRef.current?.redo();
                syncMaskFromCanvas();
              }}
            >
              <Icon name="rotate-cw" className="mr-1 h-4 w-4" />
              {t("IMAGE.INPAINT_REDO")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                editorRef.current?.clear();
                setMask(undefined);
              }}
            >
              <Icon name="eraser" className="mr-1 h-4 w-4" />
              {t("IMAGE.INPAINT_CLEAR")}
            </Button>
          </div>
        </div>
      )}
    />
  );
}
