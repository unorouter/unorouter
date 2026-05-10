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
  useDeleteGenerationMutation,
  useExportGenerationMutation,
  useGenerationStatusQuery,
  useImportGenerationMutation,
  useRevokeShareMutation,
  useShareGenerationMutation,
} from "@/hooks/generation-hook";
import { getModelDescriptor } from "@/lib/config/generation-models";
import {
  downloadGenerationImage,
  downloadGenerationSnapshot,
  readGenerationSnapshotFile,
} from "@/lib/utils/generation-export";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  LuCheck,
  LuCopy,
  LuDownload,
  LuLink2,
  LuLink2Off,
  LuShare2,
  LuSparkles,
  LuTrash2,
  LuUpload,
  LuWand,
} from "react-icons/lu";

// Result view for one generation row. Renders 1, 2, or 4 images in a grid
// depending on how many were produced. Subscribes to the polling hook and
// shows progress / failure / final grid.
type Props = {
  generationId: string;
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

// Renders 1, 2, or 4 tiles. Grid spans the same container width as the
// previous single-tile view; each cell is a square aspect.
function BatchGrid(props: {
  images: GenerationImage[];
  prompt: string;
  generationId: string;
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
        filename={`${props.generationId}.png`}
        className="aspect-square w-full"
      />
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {sorted.map((img) => (
        <ImageTile
          key={img.sequenceIndex}
          url={img.r2Url}
          alt={`${props.prompt} (${img.sequenceIndex + 1})`}
          filename={`${props.generationId}-${img.sequenceIndex}.png`}
          className="aspect-square"
        />
      ))}
    </div>
  );
}

// Single tile with a hover-download button. Mirrors the chat-thread
// markdown-text pattern: button fades in on group-hover, stays visible
// on mobile so touch users can still reach it. fetch+blob trick handles
// R2 URLs (cross-origin allowed) so the browser doesn't open the image
// in a new tab.
function ImageTile(props: {
  url: string;
  alt: string;
  filename: string;
  className?: string;
}) {
  const t = useTranslations();
  const onDownload = async () => {
    try {
      await downloadGenerationImage(props.url, props.filename);
    } catch {
      // R2 URLs are cross-origin but allow CORS; if a future CDN strips
      // it, we'd silently fail here. Open in a new tab as a fallback so
      // the user can right-click-save.
      window.open(props.url, "_blank", "noopener");
    }
  };
  return (
    <div
      className={
        "bg-muted group/img relative overflow-hidden rounded-lg " +
        (props.className ?? "")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 host varies */}
      <img
        src={props.url}
        alt={props.alt}
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={onDownload}
        title={t("IMAGE.DOWNLOAD_IMAGE")}
        className="bg-background/80 text-foreground absolute top-2 right-2 rounded-md p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100"
      >
        <LuDownload className="h-4 w-4" />
      </button>
    </div>
  );
}

// Computes days remaining until expiresAt and renders a small badge when
// the row is inside the warning window (<7 days). Returns null otherwise.
function RetentionBadge(props: { expiresAt: Date | string | number }) {
  const t = useTranslations();
  const expiresMs = new Date(props.expiresAt).getTime();
  const daysLeft = Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(daysLeft) || daysLeft > 7) return null;
  return (
    <Badge variant="outline" className="text-xs">
      {t("IMAGE.EXPIRES_IN_DAYS", { days: Math.max(0, daysLeft) })}
    </Badge>
  );
}

export function GenerateResult(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const query = useGenerationStatusQuery(props.generationId, true);
  const deleteMut = useDeleteGenerationMutation();
  const shareMut = useShareGenerationMutation();
  const revokeMut = useRevokeShareMutation();
  const exportMut = useExportGenerationMutation();
  const importMut = useImportGenerationMutation();

  // Local UI state for the Share dialog (open + "copied" feedback) and
  // the Import dialog (file picker + mode select). Share copies the
  // /shared/<shareId> URL to clipboard.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copiedTick, setCopiedTick] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<"restore" | "regenerate">(
    "restore",
  );
  const importFileRef = useRef<HTMLInputElement>(null);

  const data = query.data;
  const status = data?.status;
  const isFailed = status === "failure";
  const images = (data?.images as GenerationImage[] | undefined) ?? [];
  const isDone = status === "success" && images.length > 0;
  const requestedCount = (data?.requestedCount as number | undefined) ?? 1;
  const shareId = (data as { shareId?: string | null } | undefined)?.shareId ?? null;

  const onDelete = async () => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync({ id: props.generationId });
    router.push("/generate");
  };

  const onShare = async () => {
    if (!shareId) {
      await shareMut.mutateAsync({ id: props.generationId });
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
    await revokeMut.mutateAsync({ id: props.generationId });
    setShareDialogOpen(false);
  };

  const onExport = async () => {
    const snapshot = await exportMut.mutateAsync({ id: props.generationId });
    downloadGenerationSnapshot(snapshot, `${props.generationId}.json`);
  };

  const onImportFile = async (file: File) => {
    const parsed = await readGenerationSnapshotFile(file);
    const result = await importMut.mutateAsync({
      body: {
        // The validator pins `version: "unorouter-generation-1"` on the
        // server; if a user picks a malformed file Elysia will reject.
        snapshot: parsed as never,
        mode: importMode,
      },
    });
    setImportDialogOpen(false);
    router.push(`/generate/${result.id}`);
  };

  if (!data) {
    return <Skeleton className="aspect-square w-full max-w-2xl rounded-lg" />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {isDone ? (
        <BatchGrid
          images={images}
          prompt={data.prompt}
          generationId={props.generationId}
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
          onClick={() => router.push(`/generate?remix=${props.generationId}`)}
        >
          <LuSparkles className="mr-2" />
          {t("IMAGE.REMIX")}
        </Button>
        {/* Hires shortcut: same as Remix, but pre-toggles the SDXL hires
            fix block. Only surfaces when the source model supports it
            (Pony, Endgame, vanilla SDXL). Only meaningful on success. */}
        {isDone && getModelDescriptor(data.model).supportsHiresFix && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/generate?remix=${props.generationId}&hires=1`)
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
          onClick={onDelete}
          disabled={deleteMut.isPending}
        >
          <LuTrash2 className="mr-2" />
          {t("IMAGE.DELETE")}
        </Button>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("IMAGE.SHARE_TITLE")}</DialogTitle>
            <DialogDescription>{t("IMAGE.SHARE_DESCRIPTION")}</DialogDescription>
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
