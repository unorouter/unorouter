"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSnapshotMutation,
  useExportSessionMutation,
  useImportGenerationMutation,
  useRevokeSessionShareMutation,
  useSessionQuery,
  useShareSessionMutation,
  useSnapshotStatusQuery,
} from "@/hooks/generation-hook";
import { getModelDescriptor } from "@/lib/config/generation-models";
import {
  downloadGenerationImage,
  downloadGenerationSnapshot,
  readGenerationSnapshotFile,
} from "@/lib/utils/generation-export";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  restoreSnapshotIntoFormAtom,
} from "@/store/generation-store";
import { useAtom, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCopy,
  LuDownload,
  LuLink2,
  LuLink2Off,
  LuShare2,
  LuSparkles,
  LuTrash2,
  LuUpload,
  LuWand,
  LuX,
} from "react-icons/lu";

type Props = {
  sessionId: string;
  snapshotId: string;
};

type GenerationImage = {
  sequenceIndex: number;
  r2Url: string;
};

function ParamsBadge(props: { model: string; params: unknown }) {
  const p =
    props.params && typeof props.params === "object"
      ? (props.params as Record<string, unknown>)
      : null;
  return (
    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
      <span>{props.model}</span>
      {p?.steps !== undefined && <span>steps {String(p.steps)}</span>}
      {p?.cfg !== undefined && <span>cfg {String(p.cfg)}</span>}
      {p?.guidance !== undefined && <span>guidance {String(p.guidance)}</span>}
      {p?.seed !== undefined && <span>seed {String(p.seed)}</span>}
    </div>
  );
}

function RetentionBadge(props: { expiresAt: Date | string | number }) {
  const t = useTranslations();
  // Stable "now" captured at mount so the render is pure. The badge is
  // re-rendered when the parent's data changes (React Query polling cadence);
  // a per-second-accurate countdown isn't required for a "days left" badge.
  const [now] = useState(() => Date.now());
  const expiresMs = new Date(props.expiresAt).getTime();
  const daysLeft = Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(daysLeft) || daysLeft > 7) return null;
  return (
    <Badge variant="outline" className="text-xs">
      {t("IMAGE.EXPIRES_IN_DAYS", { days: Math.max(0, daysLeft) })}
    </Badge>
  );
}

function BatchGrid(props: {
  images: GenerationImage[];
  prompt: string;
  snapshotId: string;
  onOpenLightbox: (index: number) => void;
}) {
  const count = props.images.length;
  const sorted = props.images
    .slice()
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (count === 1) {
    return (
      <ImageTile
        url={sorted[0].r2Url}
        alt={props.prompt}
        filename={`${props.snapshotId}.png`}
        className="aspect-square w-full"
        onZoom={() => props.onOpenLightbox(0)}
      />
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {sorted.map((img, i) => (
        <ImageTile
          key={img.sequenceIndex}
          url={img.r2Url}
          alt={`${props.prompt} (${img.sequenceIndex + 1})`}
          filename={`${props.snapshotId}-${img.sequenceIndex}.png`}
          className="aspect-square"
          onZoom={() => props.onOpenLightbox(i)}
        />
      ))}
    </div>
  );
}

function ImageTile(props: {
  url: string;
  alt: string;
  filename: string;
  className?: string;
  onZoom: () => void;
}) {
  const t = useTranslations();
  const onDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadGenerationImage(props.url, props.filename);
    } catch {
      window.open(props.url, "_blank", "noopener");
    }
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
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 host varies */}
      <img
        src={props.url}
        alt={props.alt}
        className="h-full w-full object-cover"
      />
      <span
        onClick={onDownload}
        title={t("IMAGE.DOWNLOAD_IMAGE")}
        className="bg-background/80 text-foreground absolute top-2 right-2 cursor-pointer rounded-md p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100"
      >
        <LuDownload className="h-4 w-4" />
      </span>
    </button>
  );
}

// Near-fullscreen modal for a single image. Click outside, Escape, or X
// dismisses. Prev/next steps through the snapshot's images when count > 1.
function ImageLightbox(props: {
  images: GenerationImage[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  alt: string;
}) {
  const t = useTranslations();
  // Derived-state pattern: when startIndex changes (parent picked a different
  // tile), reset `index` during render instead of in an effect. React supports
  // calling setState during render in this exact shape — the second render
  // sees the updated value and no cascading effect fires.
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
        current.r2Url,
        `${props.snapshotId}-${current.sequenceIndex}.png`,
      );
    } catch {
      window.open(current.r2Url, "_blank", "noopener");
    }
  };

  if (!current) return null;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="max-w-[95vw]! w-[95vw]! p-2! gap-2! sm:rounded-xl!"
        showCloseButton={false}
      >
        <div className="relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 */}
          <img
            src={current.r2Url}
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
                <LuChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                aria-label={t("IMAGE.LIGHTBOX_NEXT")}
                className="bg-background/80 absolute top-1/2 right-2 -translate-y-1/2 backdrop-blur"
              >
                <LuChevronRight />
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
            <LuX />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <span className="text-muted-foreground text-xs">
            {total > 1 ? `${index + 1} / ${total}` : ""}
          </span>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <LuDownload className="mr-2" />
            {t("IMAGE.DOWNLOAD_IMAGE")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GenerateResult(props: Props) {
  const t = useTranslations();
  const router = useRouter();

  // Pull the full session so we can render chevrons. The poll query keeps
  // the active snapshot's status fresh (still in flight) until terminal.
  const sessionQuery = useSessionQuery(props.sessionId);
  const statusQuery = useSnapshotStatusQuery(props.snapshotId, true);

  const deleteMut = useDeleteSnapshotMutation();
  const shareMut = useShareSessionMutation();
  const revokeMut = useRevokeSessionShareMutation();
  const exportMut = useExportSessionMutation();
  const importMut = useImportGenerationMutation();

  const [, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const [, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const setRestore = useSetAtom(restoreSnapshotIntoFormAtom);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copiedTick, setCopiedTick] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<"restore" | "regenerate">(
    "restore",
  );
  const importFileRef = useRef<HTMLInputElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Prefer the polling response for the active snapshot (always fresh).
  // Fall back to the session payload (snapshots[] already in cache).
  const sessionData = sessionQuery.data;
  const session = sessionData?.session;
  const snapshots = sessionData?.snapshots ?? [];
  const liveSnapshot = statusQuery.data;
  const cachedSnapshot = snapshots.find((s) => s.id === props.snapshotId);
  const data = liveSnapshot ?? cachedSnapshot;
  const shareId = session?.shareId ?? null;

  // Chevron index. Snapshots are returned newest-first; index 0 is the
  // most recent. Navigation flips the active snapshot id + URL ?snap param.
  const currentIndex = snapshots.findIndex((s) => s.id === props.snapshotId);
  const total = snapshots.length;

  const swapTo = (snapshotId: string) => {
    setActiveSnapshotId(snapshotId);
    const url = new URL(window.location.href);
    url.searchParams.set("snap", snapshotId);
    window.history.replaceState(null, "", url.toString());
  };

  const onPrevSnapshot = () => {
    if (currentIndex < 0 || total <= 1) return;
    // "prev" in UI = older = higher index in newest-first array.
    const next = snapshots[(currentIndex + 1) % total];
    swapTo(next.id);
  };
  const onNextSnapshot = () => {
    if (currentIndex < 0 || total <= 1) return;
    const next = snapshots[(currentIndex - 1 + total) % total];
    swapTo(next.id);
  };

  // When the active snapshot changes and the user isn't on the newest,
  // hand its frozen params to the form so editing-and-resubmitting is a
  // one-click flow. Skip if we're already on the newest snapshot to avoid
  // clobbering an in-progress draft.
  useEffect(() => {
    if (!data) return;
    if (currentIndex === 0) return;
    setRestore({
      model: data.model,
      prompt: data.prompt,
      negativePrompt: (data as { negativePrompt: string | null }).negativePrompt,
      params: (data.params as Record<string, unknown> | null) ?? null,
      loras: data.loras,
      references: data.references,
      extraParams:
        (data.extraParams as Record<string, unknown> | null) ?? null,
      nsfw: data.nsfw,
    });
    // We only re-restore when the active snapshot id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.snapshotId]);

  const status = data?.status;
  const isFailed = status === "failure";
  const images = (data?.images as GenerationImage[] | undefined) ?? [];
  const isDone = status === "success" && images.length > 0;
  const requestedCount =
    (data as { requestedCount?: number } | undefined)?.requestedCount ?? 1;

  const onDeleteSnapshot = async () => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    const result = await deleteMut.mutateAsync({ id: props.snapshotId });
    if (result?.sessionDeleted) {
      // Last snapshot in the session was removed; the session is gone too.
      setActiveSessionId(null);
      setActiveSnapshotId(null);
      router.push("/generate");
      return;
    }
    // Jump to the new newest snapshot in the same session.
    const remaining = snapshots.filter((s) => s.id !== props.snapshotId);
    if (remaining.length === 0) {
      router.push("/generate");
      return;
    }
    swapTo(remaining[0].id);
  };

  const onShare = async () => {
    if (!shareId) {
      await shareMut.mutateAsync({ sessionId: props.sessionId });
    }
    setShareDialogOpen(true);
  };

  const onCopyShareLink = async () => {
    if (!shareId) return;
    const url = `${window.location.origin}/shared/g/${shareId}`;
    await navigator.clipboard.writeText(url);
    setCopiedTick(true);
    setTimeout(() => setCopiedTick(false), 1500);
  };

  const onRevokeShare = async () => {
    if (!shareId) return;
    await revokeMut.mutateAsync({ sessionId: props.sessionId });
    setShareDialogOpen(false);
  };

  const onExport = async () => {
    const payload = await exportMut.mutateAsync({ sessionId: props.sessionId });
    downloadGenerationSnapshot(payload, `${props.sessionId}.json`);
  };

  const onImportFile = async (file: File) => {
    const parsed = await readGenerationSnapshotFile(file);
    const result = await importMut.mutateAsync({
      body: {
        payload: parsed as never,
        mode: importMode,
      },
    });
    setImportDialogOpen(false);
    router.push(`/generate/${result.sessionId}`);
  };

  if (!data) {
    return <Skeleton className="aspect-square w-full max-w-2xl rounded-lg" />;
  }

  const showChevrons = total > 1;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {showChevrons && (
        <div className="text-muted-foreground flex items-center justify-center gap-3 text-xs">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevSnapshot}
            aria-label={t("IMAGE.LIGHTBOX_PREV")}
          >
            <LuChevronLeft />
          </Button>
          <span>
            {t("IMAGE.SNAPSHOT_NAV_LABEL", {
              current: currentIndex >= 0 ? currentIndex + 1 : 1,
              total,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextSnapshot}
            aria-label={t("IMAGE.LIGHTBOX_NEXT")}
          >
            <LuChevronRight />
          </Button>
        </div>
      )}

      {isDone ? (
        <BatchGrid
          images={images}
          prompt={data.prompt}
          snapshotId={props.snapshotId}
          onOpenLightbox={(i) => {
            setLightboxIndex(i);
            setLightboxOpen(true);
          }}
        />
      ) : isFailed ? (
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
          <div className="text-destructive flex h-full flex-col items-center justify-center p-4 text-center text-sm">
            <p className="font-medium">{t("IMAGE.STATUS_FAILURE")}</p>
            {data.errorMessage && (
              <p className="mt-2 text-xs opacity-70">{data.errorMessage}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Skeleton className="h-full w-full" />
            <p className="text-muted-foreground absolute text-sm">
              {requestedCount > 1
                ? t("IMAGE.PROGRESS_OF_N", {
                    current: images.length,
                    total: requestedCount,
                  })
                : (data.progress ?? "0%")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ParamsBadge model={data.model} params={data.params} />
        {data.expiresAt && (
          <RetentionBadge expiresAt={data.expiresAt as Date | string} />
        )}
      </div>

      <p className="text-sm">{data.prompt}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() =>
            router.push(`/generate?remix=${props.snapshotId}`)
          }
        >
          <LuSparkles className="mr-2" />
          {t("IMAGE.REMIX")}
        </Button>
        {isDone && getModelDescriptor(data.model).supportsHiresFix && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/generate?remix=${props.snapshotId}&hires=1`)
            }
          >
            <LuWand className="mr-2" />
            {t("IMAGE.HIRES_SHORTCUT")}
          </Button>
        )}
        {isDone && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            disabled={shareMut.isPending}
          >
            <LuShare2 className="mr-2" />
            {t("IMAGE.SHARE")}
          </Button>
        )}
        {isDone && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exportMut.isPending}
          >
            <LuDownload className="mr-2" />
            {t("IMAGE.EXPORT")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
        >
          <LuUpload className="mr-2" />
          {t("IMAGE.IMPORT")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSnapshot}
          disabled={deleteMut.isPending}
        >
          <LuTrash2 className="mr-2" />
          {t("IMAGE.DELETE")}
        </Button>
      </div>

      <ImageLightbox
        images={images}
        startIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        snapshotId={props.snapshotId}
        alt={data.prompt}
      />

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("IMAGE.SHARE_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("IMAGE.SHARE_SESSION_HELP")}
            </DialogDescription>
          </DialogHeader>
          {shareId && (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/g/${shareId}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCopyShareLink}
              >
                {copiedTick ? (
                  <LuCheck className="h-4 w-4" />
                ) : (
                  <LuCopy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onRevokeShare}
              disabled={revokeMut.isPending || !shareId}
            >
              <LuLink2Off className="mr-2" />
              {t("IMAGE.SHARE_REVOKE")}
            </Button>
            <Button
              type="button"
              onClick={() => setShareDialogOpen(false)}
            >
              <LuLink2 className="mr-2" />
              {t("IMAGE.SHARE_DONE")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("IMAGE.IMPORT_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("IMAGE.IMPORT_DESCRIPTION")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select
              value={importMode}
              onValueChange={(v) =>
                setImportMode(v as "restore" | "regenerate")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restore">
                  {t("IMAGE.IMPORT_MODE_RESTORE")}
                </SelectItem>
                <SelectItem value="regenerate">
                  {t("IMAGE.IMPORT_MODE_REGENERATE")}
                </SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
              }}
              className="text-sm"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
