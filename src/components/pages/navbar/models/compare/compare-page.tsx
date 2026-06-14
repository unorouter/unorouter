"use client";

import { PageHeader } from "@/components/elements/content/page-header";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { ComparisonTable } from "./comparison-table";
import { ModelPicker } from "./model-picker";
import { PresetCards } from "./preset-cards";

export function ComparePage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = usePricingQuery();
  const rankings = useRankingsQuery("week");

  const models = data?.models ?? [];
  const rankMap = new Map<string, RankedModel>(
    (rankings.data?.models ?? []).map((row) => [row.model_name, row]),
  );

  const selectedNames = (searchParams.get("models") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const selectedModels = selectedNames
    .map((n) => models.find((m) => m.name === n))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  function setSelected(names: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (names.length > 0) params.set("models", names.join(","));
    else params.delete("models");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  function add(name: string) {
    if (!selectedNames.includes(name)) setSelected([...selectedNames, name]);
  }
  function remove(name: string) {
    setSelected(selectedNames.filter((n) => n !== name));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pt-24 pb-16">
      <PageHeader
        badge={t("MODELS.COMPARE.BADGE")}
        badgeIcon="chart-column"
        title={t("MODELS.COMPARE.TITLE")}
        subtitle={t("MODELS.COMPARE.SUBTITLE")}
        color="#22d3ee"
        centered
        className="mb-12"
      />

      {selectedModels.length === 0 ? (
        <PresetCards models={models} rankMap={rankMap} onSelect={setSelected} />
      ) : (
        <div className="flex flex-col gap-6">
          <ComparisonTable
            models={selectedModels}
            rankMap={rankMap}
            onRemove={remove}
          />
          <div>
            <ModelPicker models={models} selected={selectedNames} onAdd={add} />
          </div>
        </div>
      )}
    </div>
  );
}
