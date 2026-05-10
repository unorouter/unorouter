"use client";

// HTML5 canvas brush for the Inpaint sub-mode. The user uploads or
// selects an init image, brushes the area they want regenerated, and
// the resulting mask (white = mask, black = keep) is written to
// `inpaintMaskAtom` as a PNG data URL. On submit, generate-form.tsx
// uploads the mask to R2 and threads the URL into params.maskUrl.
//
// No external lib: a plain <canvas> sized to the source image
// dimensions, with a transparent overlay for the brush strokes. Brush
// size + opacity controls live in the toolbar. The image is rendered
// underneath via background-image so we don't have to worry about
// CORS-tainting the canvas.

import { useTranslations } from "next-intl";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setMask] = useAtom(inpaintMaskAtom);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
  const drawingRef = useRef(false);
  const dimsRef = useRef<{ w: number; h: number } | null>(null);

  // Set up the canvas at native image dimensions so the brush draws at
  // 1:1 to the model input. CSS scales it down to fit; we capture pointer
  // coords and rescale to native each event.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      dimsRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    img.src = props.imageUrl;
  }, [props.imageUrl]);

  const exportMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dims = dimsRef.current;
    if (!dims) return;
    // Make a black/white version: pixels with any alpha become white,
    // everything else stays black. ComfyUI mask nodes expect this.
    const tmp = document.createElement("canvas");
    tmp.width = dims.w;
    tmp.height = dims.h;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.fillStyle = "black";
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    const sctx = canvas.getContext("2d");
    if (!sctx) return;
    const src = sctx.getImageData(0, 0, canvas.width, canvas.height);
    const out = tctx.getImageData(0, 0, tmp.width, tmp.height);
    for (let i = 0; i < src.data.length; i += 4) {
      if (src.data[i + 3] > 8) {
        out.data[i] = 255;
        out.data[i + 1] = 255;
        out.data[i + 2] = 255;
        out.data[i + 3] = 255;
      }
    }
    tctx.putImageData(out, 0, 0);
    setMask(tmp.toDataURL("image/png"));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    paint(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    paint(e);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    exportMask();
  };

  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const onClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMask(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-md border"
        style={{
          backgroundImage: `url(${props.imageUrl})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#000",
          aspectRatio: "1",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="h-full w-full cursor-crosshair touch-none"
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
