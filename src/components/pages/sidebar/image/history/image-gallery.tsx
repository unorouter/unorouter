"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/ui/smart-image";
import { useSessionHistoryQuery } from "@/hooks/ai/image-hook";
import { Link } from "@/i18n/navigation";
import type { ImageView } from "@/lib/types";
import { downloadBlob } from "@/lib/utils/client";
import { cn } from "@/lib/utils";
import type { QuickTarget } from "../result/use-snapshot-restore-actions";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";

type QuickHandler = (src: string, target: QuickTarget) => void;

// Falls back to square only when the row carries no dimensions (older rows predate them).
function aspectRatioOf(img: ImageView): string | undefined {
  if (!img.width || !img.height) return undefined;
  return `${img.width} / ${img.height}`;
}

// Always visible on touch (no hover there); 32px targets, tappable without covering the tile.
function QuickButton(props: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.label}
      aria-label={props.label}
      className="hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded md:size-auto md:p-1"
    >
      <Icon name={props.icon} className="size-4 md:size-3.5" />
    </button>
  );
}

// The extension must match the actual bytes: Runware serves jpeg/webp, and a
// jpeg saved as ".png" comes back from an iOS photo roll as a file nothing
// accepts, including our own img2img upload.
function imageExt(mimeType: string | null | undefined): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

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
  /** CSS aspect-ratio. Absent keeps whatever the className sets. */
  aspectRatio?: string;
  seed?: number | null;
  onZoom: () => void;
  onQuickAction?: QuickHandler;
  supportsHires?: boolean;
  onReuseSeed?: (seed: number) => void;
}) {
  const t = useTranslations();
  const onDownload = async () => {
    try {
      await downloadGenerationImage(props.src, props.filename);
    } catch {
      window.open(props.src, "_blank", "noopener");
    }
  };
  const quick = (target: QuickTarget) => {
    props.onQuickAction?.(props.src, target);
  };
  return (
    <div
      className={
        "bg-muted group/img relative overflow-hidden rounded-lg " +
        (props.className ?? "")
      }
      style={props.aspectRatio ? { aspectRatio: props.aspectRatio } : undefined}
    >
      <button
        type="button"
        onClick={props.onZoom}
        aria-label={props.alt}
        className="absolute inset-0 cursor-zoom-in"
      >
        <SmartImage
          src={props.src}
          alt={props.alt}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          // contain when the box matches the image: never crop a paid result.
          className={props.aspectRatio ? "object-contain" : "object-cover"}
        />
      </button>
      <button
        type="button"
        onClick={onDownload}
        title={t("IMAGE.DOWNLOAD_IMAGE")}
        className="bg-background/80 text-foreground absolute top-2 right-2 cursor-pointer rounded-md p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100"
      >
        <Icon name="download" className="h-4 w-4" />
      </button>
      {/* The provider-chosen seed is the only way to reproduce an unpinned generation. */}
      {typeof props.seed === "number" && (
        <button
          type="button"
          onClick={() => props.onReuseSeed?.(props.seed as number)}
          disabled={!props.onReuseSeed}
          title={t("IMAGE.REUSE_SEED")}
          className="bg-background/80 text-foreground absolute top-2 left-2 cursor-pointer rounded-md px-1.5 py-1 font-mono text-[10px] tabular-nums opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 disabled:cursor-default max-md:opacity-100"
        >
          {t("IMAGE.PARAM_SEED")} {props.seed}
        </button>
      )}
      {props.onQuickAction && (
        <div className="bg-background/80 text-foreground absolute right-2 bottom-2 flex gap-1 rounded-md p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100">
          {/* Per-image: each batch result carries its own seed. */}
          <QuickButton
            icon="sparkles"
            label={t("IMAGE.REMIX")}
            onClick={() => quick({ tab: "text2img", remix: true })}
          />
          <QuickButton
            icon="paintbrush"
            label={t("IMAGE.HOVER_INPAINT")}
            onClick={() => quick({ tab: "img2img", subPill: "inpaint" })}
          />
          {props.supportsHires && (
            <QuickButton
              icon="wand"
              label={t("IMAGE.HOVER_HIRES")}
              onClick={() => quick({ tab: "img2img", hires: true })}
            />
          )}
          <QuickButton
            icon="pencil-ruler"
            label={t("IMAGE.HOVER_ADETAILER")}
            onClick={() => quick({ tab: "img2img", adetailer: true })}
          />
          <QuickButton
            icon="pencil"
            label={t("IMAGE.HOVER_EDIT")}
            onClick={() => quick({ tab: "edit" })}
          />
        </div>
      )}
    </div>
  );
}

export function BatchGrid(props: {
  images: ImageView[];
  prompt: string;
  snapshotId: string;
  onOpenLightbox: (index: number) => void;
  onQuickAction?: QuickHandler;
  supportsHires?: boolean;
  onReuseSeed?: (seed: number) => void;
}) {
  const sorted = props.images
    .slice()
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (sorted.length === 1) {
    return (
      <ImageTile
        src={sorted[0].src}
        alt={props.prompt}
        filename={`${props.snapshotId}.${imageExt(sorted[0].mimeType)}`}
        // aspect-square only as fallback: a fill image in a height-less box collapses.
        className={aspectRatioOf(sorted[0]) ? "w-full" : "aspect-square w-full"}
        aspectRatio={aspectRatioOf(sorted[0])}
        seed={sorted[0].seed}
        onZoom={() => props.onOpenLightbox(0)}
        onQuickAction={props.onQuickAction}
        supportsHires={props.supportsHires}
        onReuseSeed={props.onReuseSeed}
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
          filename={`${props.snapshotId}-${img.sequenceIndex}.${imageExt(img.mimeType)}`}
          className="aspect-square"
          seed={img.seed}
          onZoom={() => props.onOpenLightbox(i)}
          onQuickAction={props.onQuickAction}
          supportsHires={props.supportsHires}
          onReuseSeed={props.onReuseSeed}
        />
      ))}
    </div>
  );
}

export function ImageLightbox(props: {
  images: ImageView[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  alt: string;
}) {
  const t = useTranslations();
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
          <SmartImage
            src={current.src}
            alt={props.alt}
            width={1536}
            height={1536}
            sizes="95vw"
            className="h-auto max-h-[85vh] w-auto max-w-full object-contain"
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

export function ImageSessionList() {
  const t = useTranslations();
  const sidebar = useSidebar();
  const pathname = usePathname();
  const query = useSessionHistoryQuery();

  const items = query.data?.items ?? [];
  const segments = pathname.split("/").filter(Boolean);
  const imageIdx = segments.findIndex((s) => s === "image");
  const activeSessionId =
    imageIdx >= 0 && segments[imageIdx + 1]
      ? segments[imageIdx + 1]
      : undefined;

  if (sidebar.state === "collapsed") return null;

  return (
    <>
      <SidebarGroup className="shrink-0">
        <SidebarGroupContent>
          <Link
            href="/image"
            className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-full items-center justify-start rounded-md border bg-transparent px-3 text-sm font-medium"
          >
            <Icon name="plus" className="mr-2 h-3.5 w-3.5" />
            {t("IMAGE.NEW_SESSION")}
          </Link>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <SidebarGroupContent>
          {query.isLoading ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground p-2 text-center text-xs">
              {t("IMAGE.HISTORY_EMPTY")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((row) => {
                const session = row.session;
                const latest = row.latestSnapshot;
                const firstImage = row.latestImage;
                const snapshotCount = session.snapshotCount ?? 0;
                const extra = snapshotCount > 1 ? snapshotCount - 1 : 0;
                return (
                  <Link
                    key={session.id}
                    href={{
                      pathname: "/image/[id]",
                      params: { id: session.id },
                    }}
                    title={latest?.prompt ?? session.title ?? ""}
                    className={cn(
                      "bg-muted relative block aspect-square overflow-hidden rounded",
                      "ring-offset-background hover:ring-ring hover:ring-1",
                      activeSessionId === session.id && "ring-ring ring-2",
                    )}
                  >
                    {firstImage?.src ? (
                      <SmartImage
                        src={firstImage.src}
                        alt={latest?.prompt ?? session.title ?? ""}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[10px]">
                        {latest?.status === "failure"
                          ? "!"
                          : (latest?.progress ?? "?")}
                      </div>
                    )}
                    {extra > 0 && (
                      <span className="bg-background/80 text-foreground absolute right-1 bottom-1 rounded px-1 text-[10px] font-medium">
                        +{extra}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
