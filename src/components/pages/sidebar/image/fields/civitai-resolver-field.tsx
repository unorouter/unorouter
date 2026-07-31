"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResolveCivitaiMutation } from "@/hooks/ai/image-catalog-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type ResolvedCheckpoint = {
  air: string;
  name: string;
  architecture: string | null;
};

type Props = {
  value: ResolvedCheckpoint | null;
  onChange: (next: ResolvedCheckpoint | null) => void;
};

/**
 * Two step handshake for a user supplied checkpoint: paste, resolve, then generate.
 *
 * Resolving before submitting is what makes an arbitrary checkpoint safe to offer. Runware
 * pins its own version ids, so an id taken straight from a Civitai URL is often rejected, and
 * resolving here turns that into an inline message instead of a failed generation the user
 * already waited for.
 */
export function CivitaiResolverField(props: Props) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const resolve = useResolveCivitaiMutation();

  async function run() {
    if (!query.trim()) return;
    setFailed(false);
    props.onChange(null);
    const resolved = await resolve.mutateAsync(query.trim());
    if (!resolved) {
      setFailed(true);
      return;
    }
    props.onChange(resolved);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t("IMAGE.CIVITAI_TITLE")}</div>
      <div className="flex gap-2">
        <Input
          value={query}
          placeholder={t("IMAGE.CIVITAI_PLACEHOLDER")}
          onChange={(e) => {
            setQuery(e.target.value);
            setFailed(false);
            // The pasted reference no longer matches what was resolved, so drop the
            // resolution and make the user resolve again before generating.
            if (props.value) props.onChange(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!query.trim() || resolve.isPending}
          onClick={() => void run()}
        >
          {resolve.isPending
            ? t("IMAGE.CIVITAI_RESOLVING")
            : t("IMAGE.CIVITAI_RESOLVE")}
        </Button>
      </div>

      {props.value ? (
        <div className="text-xs text-emerald-600 dark:text-emerald-400">
          {t("IMAGE.CIVITAI_RESOLVED", { name: props.value.name })}
        </div>
      ) : failed ? (
        <div className="text-destructive text-xs">
          {t("IMAGE.CIVITAI_FAILED")}
        </div>
      ) : (
        <div className="text-muted-foreground text-xs">
          {t("IMAGE.CIVITAI_HINT")}
        </div>
      )}
    </div>
  );
}
