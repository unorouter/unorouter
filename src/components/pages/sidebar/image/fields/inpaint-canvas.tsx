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

const DEFAULT_BRUSH = 32;
const DEFAULT_OPACITY = 0.6;

type Props = {
  imageUrl: string;
};

export function InpaintCanvas(props: Props) {
  const t = useTranslations();
  const form = useFormContext();
  const editorRef = useRef<MaskEditorCanvasRef>(
    null as unknown as MaskEditorCanvasRef,
  );

  const ui = (form.watch("ui") as Record<string, unknown> | undefined) ?? {};
  const brushSize =
    (ui.inpaintBrushSize as number | undefined) ?? DEFAULT_BRUSH;
  const opacity =
    (ui.inpaintBrushOpacity as number | undefined) ?? DEFAULT_OPACITY;

  const setUi = (patch: Record<string, unknown>) => {
    form.setValue("ui", { ...ui, ...patch } as never, { shouldDirty: true });
  };

  const onDrawingChange = (isDrawing: boolean) => {
    if (isDrawing) return;
    const canvas = editorRef.current?.maskCanvas;
    // toMask reads getImageData(0, 0, width, height) with no guard of its own, and a zero
    // dimension makes that throw IndexSizeError, which took down the whole page. The canvas
    // is still unsized until the source image loads, so a touch before then hits this.
    if (!canvas || !canvas.width || !canvas.height) return;
    try {
      setUi({ inpaintMaskDataUrl: toMask(canvas) });
    } catch {
      // A mask that cannot be read is not worth losing the page over; the next stroke retries.
    }
  };

  return (
    <Controller
      control={form.control}
      name="ui.inpaintMaskDataUrl"
      render={({ field }) => (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-md border">
            <MaskEditor
              src={props.imageUrl}
              canvasRef={editorRef}
              cursorSize={brushSize}
              maskOpacity={opacity}
              maskColor="#ffffff"
              maskBlendMode="normal"
              onCursorSizeChange={(size) => setUi({ inpaintBrushSize: size })}
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
                  setUi({ inpaintBrushSize: Array.isArray(v) ? v[0] : v })
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
                  setUi({ inpaintBrushOpacity: Array.isArray(v) ? v[0] : v })
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
                editorRef.current?.clear();
                field.onChange(undefined);
              }}
            >
              <Icon name="rotate-ccw" className="mr-1 h-4 w-4" />
              {t("IMAGE.INPAINT_CLEAR")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => field.onChange(undefined)}
            >
              <Icon name="eraser" className="mr-1 h-4 w-4" />
              {t("IMAGE.INPAINT_DISCARD")}
            </Button>
          </div>
        </div>
      )}
    />
  );
}
