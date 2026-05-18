"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useForkSharedSessionMutation,
  useSharedSessionQuery,
} from "@/hooks/generation-hook";
import { useAuthQuery } from "@/hooks/auth-hook";
import { downloadGenerationImage } from "@/components/pages/sidebar/generate/utils/generation-export";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCookie } from "cookies-next";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { usePathname } from "next/navigation";

type GenerationImage = {
  sequenceIndex: number;
  r2Url: string;
};

type Props = {
  shareId: string;
};

// Read-only public view of a shared session. Shows the full snapshot
// history with chevron navigation. Fork copies the whole session into
// the visitor's account.
export function SharedGenerationView(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSharedSessionQuery(props.shareId);
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const forkMut = useForkSharedSessionMutation();
  const [forkMode, setForkMode] = useState<"restore" | "regenerate">("restore");
  const [snapshotIndex, setSnapshotIndex] = useState(0);

  const data = query.data;
  const session = data?.session;
  const snapshots = data?.snapshots ?? [];
  const total = snapshots.length;
  const active = snapshots[snapshotIndex];
  const images = (active?.images as GenerationImage[] | undefined) ?? [];

  const onFork = async () => {
    if (!isLoggedIn) {
      setCookie(AUTH_REDIRECT_COOKIE, pathname, { maxAge: 300 });
      router.push("/login");
      return;
    }
    const result = await forkMut.mutateAsync({
      shareId: props.shareId,
      body: { mode: forkMode },
    });
    router.push(`/generate/${result.sessionId}`);
  };

  if (!data || !session) return null;

  const onPrev = () => setSnapshotIndex((i) => (i + 1) % total);
  const onNext = () => setSnapshotIndex((i) => (i - 1 + total) % total);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <header>
        <h1 className="text-foreground text-2xl font-semibold">
          {session.title ?? t("IMAGE.SHARED_TITLE")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {session.firstModel ?? active?.model ?? ""}
        </p>
      </header>

      {total > 1 && (
        <div className="text-muted-foreground flex items-center justify-center gap-3 text-xs">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            aria-label={t("IMAGE.LIGHTBOX_PREV")}
          >
            <Icon name="chevron-left" />
          </Button>
          <span>
            {t("IMAGE.SNAPSHOT_NAV_LABEL", {
              current: snapshotIndex + 1,
              total,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label={t("IMAGE.LIGHTBOX_NEXT")}
          >
            <Icon name="chevron-right" />
          </Button>
        </div>
      )}

      {images.length > 0 && (
        <div
          className={
            images.length === 1 ? "w-full" : "grid w-full grid-cols-2 gap-2"
          }
        >
          {images
            .slice()
            .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
            .map((img) => (
              <div
                key={img.sequenceIndex}
                className="bg-muted group/img relative aspect-square overflow-hidden rounded-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- R2 */}
                <img
                  src={img.r2Url}
                  alt={active?.prompt ?? ""}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    void downloadGenerationImage(
                      img.r2Url,
                      `${props.shareId}-${img.sequenceIndex}.png`,
                    );
                  }}
                  title={t("IMAGE.DOWNLOAD_IMAGE")}
                  className="bg-background/80 text-foreground absolute top-2 right-2 rounded-md p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 max-md:opacity-100"
                >
                  <Icon name="download" className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      )}

      {active && (
        <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">
            {t("IMAGE.PROMPT_LABEL")}
          </p>
          <p className="text-sm whitespace-pre-wrap">{active.prompt}</p>
          {active.negativePrompt && (
            <>
              <p className="text-muted-foreground mt-2 text-xs">
                {t("IMAGE.NEGATIVE_PROMPT_LABEL")}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {active.negativePrompt}
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(active.prompt)}
            className="text-muted-foreground hover:text-foreground mt-2 inline-flex w-fit items-center gap-1 text-xs"
          >
            <Icon name="copy" className="h-3 w-3" />
            {t("IMAGE.COPY_PROMPT")}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={forkMode}
          onValueChange={(v) => setForkMode(v as "restore" | "regenerate")}
        >
          <SelectTrigger className="w-full sm:w-64">
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
        <Button onClick={onFork} disabled={forkMut.isPending}>
          <Icon name="sparkles" className="mr-2" />
          {t("IMAGE.SAVE_TO_ACCOUNT")}
        </Button>
      </div>
    </div>
  );
}
