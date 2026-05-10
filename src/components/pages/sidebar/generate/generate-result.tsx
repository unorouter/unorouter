"use client";

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

// Single-tile result view. Subscribes to the polling hook and renders
// skeleton -> progress badge -> image. Used by /generate/[id] today;
// the multi-variant grid will compose multiple of these by batchId in
// a later phase.
type Props = {
  generationId: string;
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

export function GenerateResult(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const query = useGenerationStatusQuery(props.generationId, true);
  const deleteMut = useDeleteGenerationMutation();

  const data = query.data;
  const status = data?.status;
  const isFailed = status === "failure";
  const isDone = status === "success" && data?.r2Url;

  const onDelete = async () => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync({ id: props.generationId });
    router.push("/generate");
  };

  if (!data) {
    return <Skeleton className="aspect-square w-full max-w-2xl rounded-lg" />;
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
        {isDone ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 host varies, skip optimization
          <img
            src={data.r2Url ?? ""}
            alt={data.prompt}
            className="h-full w-full object-cover"
          />
        ) : isFailed ? (
          <div className="text-destructive flex h-full flex-col items-center justify-center p-4 text-center text-sm">
            <p className="font-medium">{t("IMAGE.STATUS_FAILURE")}</p>
            {data.errorMessage && (
              <p className="mt-2 text-xs opacity-70">{data.errorMessage}</p>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Skeleton className="h-full w-full" />
            <p className="text-muted-foreground absolute text-sm">
              {data.progress ?? "0%"}
            </p>
          </div>
        )}
      </div>

      <ParamsBadge model={data.model} params={data.params} />

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
