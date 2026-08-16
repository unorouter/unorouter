"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/openapi";
import { useTranslations } from "next-intl";

function topByRank(
  models: ProcessedModel[],
  rankMap: Map<string, RankedModel>,
  predicate: (m: ProcessedModel) => boolean,
  count: number,
): string[] {
  return models
    .filter(predicate)
    .sort((a, b) => {
      const ra = rankMap.get(a.name)?.rank ?? Number.POSITIVE_INFINITY;
      const rb = rankMap.get(b.name)?.rank ?? Number.POSITIVE_INFINITY;
      return ra - rb;
    })
    .slice(0, count)
    .map((m) => m.name);
}

function cheapest(
  models: ProcessedModel[],
  predicate: (m: ProcessedModel) => boolean,
  count: number,
): string[] {
  return models
    .filter((m) => predicate(m) && !m.isFree && m.inputPrice > 0)
    .sort((a, b) => a.inputPrice - b.inputPrice)
    .slice(0, count)
    .map((m) => m.name);
}

export function PresetCards(props: {
  models: ProcessedModel[];
  rankMap: Map<string, RankedModel>;
  onSelect: (names: string[]) => void;
}) {
  const t = useTranslations();
  const models = props.models;
  const isText = (m: ProcessedModel) => m.type === "text";

  const isCode = (m: ProcessedModel) =>
    isText(m) &&
    (m.tags.some((tag) => /code|coder|coding/i.test(tag)) ||
      /cod(e|er|estral)|deepseek|qwen|glm|kimi/i.test(m.name));

  const codeNames = topByRank(models, props.rankMap, isCode, 3);
  const presets = [
    {
      key: "flagship",
      title: t("MODELS.COMPARE.PRESET_FLAGSHIP"),
      desc: t("MODELS.COMPARE.PRESET_FLAGSHIP_DESC"),
      names: topByRank(models, props.rankMap, isText, 3),
    },
    {
      key: "affordable",
      title: t("MODELS.COMPARE.PRESET_AFFORDABLE"),
      desc: t("MODELS.COMPARE.PRESET_AFFORDABLE_DESC"),
      names: cheapest(models, isText, 3),
    },
    {
      key: "code",
      title: t("MODELS.COMPARE.PRESET_CODE"),
      desc: t("MODELS.COMPARE.PRESET_CODE_DESC"),
      names:
        codeNames.length > 0
          ? codeNames
          : topByRank(models, props.rankMap, isText, 3),
    },
    {
      key: "image",
      title: t("MODELS.COMPARE.PRESET_IMAGE"),
      desc: t("MODELS.COMPARE.PRESET_IMAGE_DESC"),
      names: topByRank(models, props.rankMap, (m) => m.type === "image", 3),
    },
  ].filter((p) => p.names.length > 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {presets.map((preset) => {
        const cards = preset.names
          .map((n) => models.find((m) => m.name === n))
          .filter((m): m is ProcessedModel => Boolean(m));
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => props.onSelect(preset.names)}
            className="border-border hover:border-primary/50 flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="flex -space-x-1.5">
              {cards.map((m) => (
                <span
                  key={m.name}
                  className="border-background bg-muted flex h-7 w-7 items-center justify-center rounded-full border-2"
                >
                  <VendorIcon vendor={m.vendor.name} size={16} />
                </span>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="font-medium">{preset.title}</span>
              <span className="text-muted-foreground line-clamp-2 text-xs">
                {preset.desc}
              </span>
            </div>
            <span className="text-muted-foreground/70 border-border/60 truncate border-t pt-2 font-mono text-xs">
              {cards.map((m) => m.name).join(", ")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
