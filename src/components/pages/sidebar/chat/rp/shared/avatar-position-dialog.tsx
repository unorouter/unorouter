"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { focalToObjectPosition } from "@/hooks/ai/use-media-src";
import { pushLocalTheme } from "@/lib/db/client/data/theme";
import { AVATAR_SIZES, userThemeAtom } from "@/components/ui/theme/theme-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export type Focal = { x: number; y: number };

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function AvatarPositionDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  shape: "circle" | "banner";
  focal: Focal;
  onConfirm: (focal: Focal) => void;
}) {
  const t = useTranslations();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    from: Focal;
  } | null>(null);
  const [focal, setFocal] = useState<Focal>(props.focal);
  const [theme, setTheme] = useAtom(userThemeAtom);

  // Dragging the image right must reveal what sits to its left, so the focal
  // percentage moves against the pointer.
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !frame) return;
    const rect = frame.getBoundingClientRect();
    setFocal({
      x: clamp(drag.from.x - ((e.clientX - drag.startX) / rect.width) * 100),
      y: clamp(drag.from.y - ((e.clientY - drag.startY) / rect.height) * 100),
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("RP.AVATAR_POSITION")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-xs">
          {t("RP.AVATAR_POSITION_HINT")}
        </p>
        <div className="flex justify-center">
          <div
            ref={frameRef}
            // touch-none: without it the browser scrolls the dialog instead of
            // delivering pointermove, so the drag never starts on mobile.
            className={`border-border/40 relative touch-none overflow-hidden border select-none ${
              props.shape === "circle"
                ? "size-56 rounded-full"
                : "h-40 w-full rounded-lg"
            } cursor-grab active:cursor-grabbing`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                from: focal,
              };
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image cannot optimize it */}
            <img
              src={props.src}
              alt=""
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
              style={{
                objectPosition: focalToObjectPosition(focal.x, focal.y),
              }}
            />
          </div>
        </div>
        {props.shape === "circle" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">
              {t("THEME.AVATAR_SCALE")}
            </span>
            <div className="flex gap-2">
              {AVATAR_SIZES.map((size) => (
                <Button
                  key={size.scale}
                  type="button"
                  size="sm"
                  className="flex-1"
                  variant={
                    (theme.chatAvatarScale ?? 1) === size.scale
                      ? "default"
                      : "outline"
                  }
                  onClick={() => {
                    const next = { ...theme, chatAvatarScale: size.scale };
                    setTheme(next);
                    void pushLocalTheme(next).catch(() => {});
                  }}
                >
                  {t(size.labelKey)}
                </Button>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFocal({ x: 50, y: 50 })}
          >
            {t("COMMON.RESET")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              props.onConfirm(focal);
              props.onOpenChange(false);
            }}
          >
            {t("COMMON.SAVE")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
