"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCivitaiVersionsMutation } from "@/hooks/ai/image-catalog-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { CustomCheckpoint } from "../form/model-picker";

type Props = {
  value: CustomCheckpoint | null;
  onChange: (next: CustomCheckpoint | null) => void;
  /** Persisted across remounts by the form; submitting navigates to the result and rebuilds this field. */
  query: string;
  onQueryChange: (next: string) => void;
};

/**
 * Paste a reference, check it, then pick a version.
 *
 * Checking before generating is what makes an arbitrary checkpoint safe to offer: the
 * provider pins its own version ids, so an id taken straight from a Civitai URL is often not
 * loadable, and finding that out here costs nothing instead of a failed generation.
 *
 * The version list is the point rather than a detail. One Civitai model is a family (LUSTIFY
 * alone has eleven: alpha, lightning and DMD2 variants) that generate quite differently, so
 * resolving to one silently would hand the user a model they did not choose.
 */
export function CivitaiResolverField(props: Props) {
  const t = useTranslations();
  const query = props.query;
  const [versions, setVersions] = useState<CustomCheckpoint[] | null>(null);
  const lookup = useCivitaiVersionsMutation();

  async function run() {
    if (!query.trim()) return;
    setVersions(null);
    props.onChange(null);
    const result = await lookup.mutateAsync(query.trim());
    const items = (result?.items ?? []) as CustomCheckpoint[];
    setVersions(items);
    // The version named in the reference leads the list, so a URL that already picked one
    // needs no second click.
    if (items[0]) props.onChange(items[0]);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t("IMAGE.CIVITAI_TITLE")}</div>
      <div className="flex gap-2">
        <Input
          value={query}
          placeholder={t("IMAGE.CIVITAI_PLACEHOLDER")}
          onChange={(e) => {
            props.onQueryChange(e.target.value);
            setVersions(null);
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
          disabled={!query.trim() || lookup.isPending}
          onClick={() => void run()}
        >
          {lookup.isPending
            ? t("IMAGE.CIVITAI_RESOLVING")
            : t("IMAGE.CIVITAI_RESOLVE")}
        </Button>
      </div>

      {versions && versions.length > 0 && (
        <div className="thin-scrollbar flex max-h-48 flex-col gap-1 overflow-y-auto">
          {versions.map((v) => {
            const isActive = props.value?.air === v.air;
            return (
              <button
                key={v.air}
                type="button"
                onClick={() => props.onChange(v)}
                className={
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors " +
                  (isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent")
                }
              >
                <span className="min-w-0 flex-1 truncate">{v.name}</span>
                {v.architecture && (
                  <span className="text-muted-foreground shrink-0 text-[10px] uppercase">
                    {v.architecture}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* The list only exists after a lookup, but the choice outlives it (a restored draft or
          snapshot carries the checkpoint alone), so show what is selected rather than a bare
          hint that reads as nothing being picked. */}
      {!versions && props.value && (
        <div className="border-primary bg-primary/10 text-primary flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate">{props.value.name}</span>
          {props.value.architecture && (
            <span className="shrink-0 text-[10px] uppercase opacity-70">
              {props.value.architecture}
            </span>
          )}
        </div>
      )}

      {versions && versions.length === 0 ? (
        <div className="text-destructive text-xs">
          {t("IMAGE.CIVITAI_FAILED")}
        </div>
      ) : !versions && !props.value ? (
        <div className="text-muted-foreground text-xs">
          {t("IMAGE.CIVITAI_HINT")}
        </div>
      ) : null}
    </div>
  );
}
