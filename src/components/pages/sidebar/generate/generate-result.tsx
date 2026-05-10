"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteGenerationMutation,
  useGenerationStatusQuery,
} from "@/hooks/generation-hook";
import { getModelDescriptor } from "@/lib/config/generation-models";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LuSparkles, LuTrash2, LuWand } from "react-icons/lu";

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
function BatchGrid(props: { images: GenerationImage[]; prompt: string }) {
  const count = props.images.length;
  const sorted = props.images
    .slice()
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (count === 1) {
    const img = sorted[0];
    return (
      <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 host varies, skip optimization */}
        <img
          src={img.r2Url}
          alt={props.prompt}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  const cols = count === 2 ? "grid-cols-2" : "grid-cols-2";
  return (
    <div className={`grid w-full gap-2 ${cols}`}>
      {sorted.map((img) => (
        <div
          key={img.sequenceIndex}
          className="bg-muted relative aspect-square overflow-hidden rounded-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 host varies */}
          <img
            src={img.r2Url}
            alt={`${props.prompt} (${img.sequenceIndex + 1})`}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
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

  const data = query.data;
  const status = data?.status;
  const isFailed = status === "failure";
  const images = (data?.images as GenerationImage[] | undefined) ?? [];
  const isDone = status === "success" && images.length > 0;
  const requestedCount = (data?.requestedCount as number | undefined) ?? 1;

  const onDelete = async () => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync({ id: props.generationId });
    router.push("/generate");
  };

  if (!data) {
    return <Skeleton className="aspect-square w-full max-w-2xl rounded-lg" />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {isDone ? (
        <BatchGrid images={images} prompt={data.prompt} />
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
    </div>
  );
}
