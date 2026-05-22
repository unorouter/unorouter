"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { PlaygroundImageView } from "@/lib/types";
import { downloadBlob } from "@/lib/utils/client";
import type { GenerateTab, Img2ImgSubPill } from "@/store/playground-store";
import { useTranslations } from "next-intl";
import { useState } from "react";

type QuickTarget = { tab: GenerateTab; subPill?: Img2ImgSubPill };
type QuickHandler = (src: string, target: QuickTarget) => void;

async function downloadGenerationImage(src: string, filename: string) {
  const res = await fetch(src, { cache: "no-cache" });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  downloadBlob(await res.blob(), filename);
}

function ImageTile(props: {
  src: string;
  alt: string;
  filename: string;
  className?: string;
  onZoom: () => void;
  onQuickAction?: QuickHandler;
}) {
  const t = useTranslations();
  const onDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadGenerationImage(props.src, props.filename);
    } catch {
      window.open(props.src, "_blank", "noopener");
    }
  };
  const quick = (e: React.MouseEvent, target: QuickTarget) => {
    e.stopPropagation();
    props.onQuickAction?.(props.src, target);
  };
  return (
    <button
      type="button"
      onClick={props.onZoom}
      className={
        "bg-muted group/img relative cursor-zoom-in overflow-hidden rounded-lg " +
        (props.className ?? "")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data/R2 URI */}
      <img
        src={props.src}
        alt={props.alt}
        className="h-full w-full object-cover"
      />
      <span
        onClick={onDownload}
        title={t("IMAGE.DOWNLOAD_IMAGE")}
        className="bg-background/80 text-foreground absolute top-2 right-2 cursor-pointer rounded-md p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100"
      >
        <Icon name="download" className="h-4 w-4" />
      </span>
      {props.onQuickAction && (
        <div className="bg-background/80 text-foreground absolute right-2 bottom-2 flex gap-1 rounded-md p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100">
          <span
            onClick={(e) => quick(e, { tab: "img2img", subPill: "inpaint" })}
            title={t("IMAGE.HOVER_INPAINT")}
            className="hover:bg-accent cursor-pointer rounded p-1"
          >
            <Icon name="paintbrush" className="h-3.5 w-3.5" />
          </span>
          <span
            onClick={(e) => quick(e, { tab: "img2img", subPill: "upscale" })}
            title={t("IMAGE.HOVER_UPSCALE")}
            className="hover:bg-accent cursor-pointer rounded p-1"
          >
            <Icon name="maximize-2" className="h-3.5 w-3.5" />
          </span>
          <span
            onClick={(e) => quick(e, { tab: "img2img", subPill: "adetailer" })}
            title={t("IMAGE.HOVER_ADETAILER")}
            className="hover:bg-accent cursor-pointer rounded p-1"
          >
            <Icon name="pencil-ruler" className="h-3.5 w-3.5" />
          </span>
          <span
            onClick={(e) => quick(e, { tab: "edit" })}
            title={t("IMAGE.HOVER_EDIT")}
            className="hover:bg-accent cursor-pointer rounded p-1"
          >
            <Icon name="pencil" className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </button>
  );
}

export function BatchGrid(props: {
  images: PlaygroundImageView[];
  prompt: string;
  snapshotId: string;
  onOpenLightbox: (index: number) => void;
  onQuickAction?: QuickHandler;
}) {
  const sorted = props.images
    .slice()
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (sorted.length === 1) {
    return (
      <ImageTile
        src={sorted[0].src}
        alt={props.prompt}
        filename={`${props.snapshotId}.png`}
        className="aspect-square w-full"
        onZoom={() => props.onOpenLightbox(0)}
        onQuickAction={props.onQuickAction}
      />
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {sorted.map((img, i) => (
        <ImageTile
          key={img.sequenceIndex}
          src={img.src}
          alt={`${props.prompt} (${img.sequenceIndex + 1})`}
          filename={`${props.snapshotId}-${img.sequenceIndex}.png`}
          className="aspect-square"
          onZoom={() => props.onOpenLightbox(i)}
          onQuickAction={props.onQuickAction}
        />
      ))}
    </div>
  );
}

export function ImageLightbox(props: {
  images: PlaygroundImageView[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  alt: string;
}) {
  const t = useTranslations();
  // Derived state: reset during render when startIndex changes.
  const [index, setIndex] = useState(props.startIndex);
  const [prevStartIndex, setPrevStartIndex] = useState(props.startIndex);
  if (prevStartIndex !== props.startIndex) {
    setPrevStartIndex(props.startIndex);
    setIndex(props.startIndex);
  }

  const sorted = props.images
    .slice()
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const total = sorted.length;
  const current = sorted[index];

  const onPrev = () => setIndex((i) => (i - 1 + total) % total);
  const onNext = () => setIndex((i) => (i + 1) % total);

  const onDownload = async () => {
    if (!current) return;
    try {
      await downloadGenerationImage(
        current.src,
        `${props.snapshotId}-${current.sequenceIndex}.png`,
      );
    } catch {
      window.open(current.src, "_blank", "noopener");
    }
  };

  if (!current) return null;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="w-[95vw]! max-w-[95vw]! gap-2! p-2! sm:rounded-xl!"
        showCloseButton={false}
      >
        <div className="relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- data/R2 URI */}
          <img
            src={current.src}
            alt={props.alt}
            className="max-h-[85vh] max-w-full object-contain"
          />
          {total > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={onPrev}
                aria-label={t("IMAGE.LIGHTBOX_PREV")}
                className="bg-background/80 absolute top-1/2 left-2 -translate-y-1/2 backdrop-blur"
              >
                <Icon name="chevron-left" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                aria-label={t("IMAGE.LIGHTBOX_NEXT")}
                className="bg-background/80 absolute top-1/2 right-2 -translate-y-1/2 backdrop-blur"
              >
                <Icon name="chevron-right" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => props.onOpenChange(false)}
            aria-label={t("IMAGE.LIGHTBOX_CLOSE")}
            className="bg-background/80 absolute top-2 right-2 backdrop-blur"
          >
            <Icon name="x" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <span className="text-muted-foreground text-xs">
            {total > 1 ? `${index + 1} / ${total}` : ""}
          </span>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Icon name="download" className="mr-2" />
            {t("IMAGE.DOWNLOAD_IMAGE")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
