"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  MaskEditor,
  toMask,
  type MaskEditorCanvasRef,
} from "react-canvas-masker";
import "react-canvas-masker/dist/style.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { GenerationFormValues } from "@/lib/validation/playground";

const DEFAULT_BRUSH = 32;
const DEFAULT_OPACITY = 0.6;

type Props = {
  imageUrl: string;
};

export function InpaintCanvas(props: Props) {
  const t = useTranslations();
  const form = useFormContext<GenerationFormValues>();
  const editorRef = useRef<MaskEditorCanvasRef | null>(null);

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
          <div className="relative overflow-hidden rounded-md border">
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
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.INPAINT_BRUSH_SIZE")}</Label>
                <span className="tabular-nums">{brushSize}px</span>
              </div>
              <Slider
                aria-label={t("IMAGE.INPAINT_BRUSH_SIZE")}
                min={4}
                max={128}
                step={2}
                value={[brushSize]}
                onValueChange={(v) =>
                  form.setValue(
                    "ui.inpaintBrushSize",
                    Array.isArray(v) ? v[0] : v,
                    { shouldDirty: true },
                  )
                }
              />
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <Label>{t("IMAGE.INPAINT_BRUSH_OPACITY")}</Label>
                <span className="tabular-nums">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <Slider
                aria-label={t("IMAGE.INPAINT_BRUSH_OPACITY")}
                min={0.1}
                max={1}
                step={0.05}
                value={[opacity]}
                onValueChange={(v) =>
                  form.setValue(
                    "ui.inpaintBrushOpacity",
                    Array.isArray(v) ? v[0] : v,
                    { shouldDirty: true },
                  )
                }
              />
            </div>
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
