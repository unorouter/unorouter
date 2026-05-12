"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  MaskEditor,
  toMask,
  type MaskEditorCanvasRef,
} from "react-canvas-masker";
import "react-canvas-masker/dist/style.css";
import { LuEraser, LuRotateCcw } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { inpaintMaskAtom } from "@/store/generation-store";

type Props = {
  imageUrl: string;
};

const DEFAULT_BRUSH = 32;
const DEFAULT_OPACITY = 0.6;

export function InpaintCanvas(props: Props) {
  const t = useTranslations();
  const editorRef = useRef<MaskEditorCanvasRef>(
    null as unknown as MaskEditorCanvasRef,
  );
  const [, setMask] = useAtom(inpaintMaskAtom);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);

  const onDrawingChange = (isDrawing: boolean) => {
    if (isDrawing) return;
    const canvas = editorRef.current?.maskCanvas;
    if (!canvas) return;
    setMask(toMask(canvas));
  };

  const onClear = () => {
    editorRef.current?.clear();
    setMask(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-md border">
        <MaskEditor
          src={props.imageUrl}
          canvasRef={editorRef}
          cursorSize={brushSize}
          maskOpacity={opacity}
          maskColor="#ffffff"
          maskBlendMode="normal"
          onCursorSizeChange={setBrushSize}
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
            min={4}
            max={128}
            step={2}
            value={[brushSize]}
            onValueChange={(v) => setBrushSize(Array.isArray(v) ? v[0] : v)}
          />
        </div>
        <div>
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <Label>{t("IMAGE.INPAINT_BRUSH_OPACITY")}</Label>
            <span className="tabular-nums">{Math.round(opacity * 100)}%</span>
          </div>
          <Slider
            min={0.1}
            max={1}
            step={0.05}
            value={[opacity]}
            onValueChange={(v) => setOpacity(Array.isArray(v) ? v[0] : v)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <LuRotateCcw className="mr-1 h-4 w-4" />
          {t("IMAGE.INPAINT_CLEAR")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMask(null)}
        >
          <LuEraser className="mr-1 h-4 w-4" />
          {t("IMAGE.INPAINT_DISCARD")}
        </Button>
      </div>
    </div>
  );
}
