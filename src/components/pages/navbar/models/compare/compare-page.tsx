"use client";

import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { usePerfMetricsSummaryQuery } from "@/hooks/models/perf-metrics-hook";
import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import { useRouter } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import type { RankedModel } from "@/openapi";
import { modelMatchesSlug, modelSlug } from "@/lib/utils/base";
import type { ModelSummary } from "@/openapi";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { ComparisonTable } from "./comparison-table";
import { CompareBreadcrumb } from "./compare-breadcrumb";
import { comboTitle } from "./compare-text";
import { ModelPicker } from "./model-picker";
import { PopularPairs } from "./popular-pairs";
import { PresetCards } from "./preset-cards";

export function ComparePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { data } = usePricingQuery();
  const rankings = useRankingsQuery("week");
  const perfQuery = usePerfMetricsSummaryQuery(24);

  const models = data?.models ?? [];
  const rankMap = new Map<string, RankedModel>(
    (rankings.data?.models ?? []).map((row) => [row.model_name, row]),
  );
  const perfMap = new Map<string, ModelSummary>(
    (perfQuery.data?.models ?? []).map((row) => [row.model_name, row]),
  );

  const slugs = Array.isArray(params.slugs)
    ? params.slugs
    : params.slugs
      ? [params.slugs]
      : [];
  const selectedModels = slugs
    .map((slug) => models.find((m) => modelMatchesSlug(m.name, slug)))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  const selectedNames = selectedModels.map((m) => m.name);

  function goTo(names: string[]) {
    if (names.length === 0) {
      router.push("/compare");
      return;
    }
    router.push({
      pathname: "/compare/[...slugs]",
      params: { slugs: names.map(modelSlug) },
    });
  }
  function add(name: string) {
    if (!selectedNames.includes(name)) {
      analytics.models.compareAdded({ model: name });
      goTo([...selectedNames, name]);
    }
  }
  function remove(name: string) {
    goTo(selectedNames.filter((n) => n !== name));
  }

  const combo =
    selectedModels.length > 0 ? comboTitle(selectedModels) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-6 pt-24 pb-16">
      <CompareBreadcrumb combo={combo} />

      {selectedModels.length === 0 ? (
        <>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            {t("MODELS.COMPARE.TITLE")}
          </h1>
          <p className="text-muted-foreground mb-8 text-sm">
            {t("MODELS.COMPARE.SUBTITLE")}
          </p>
          <PresetCards models={models} rankMap={rankMap} onSelect={goTo} />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModelPicker
              models={models}
              selected={selectedNames}
              onAdd={add}
              variant="slot"
            />
            <ModelPicker
              models={models}
              selected={selectedNames}
              onAdd={add}
              variant="slot"
            />
          </div>
          <PopularPairs models={models} />
        </>
      ) : (
        <>
          <h1 className="mb-6 text-2xl font-semibold tracking-tight">
            {combo}
          </h1>
          <div className="mb-6 flex items-center gap-2">
            <ModelPicker models={models} selected={selectedNames} onAdd={add} />
            <button
              type="button"
              onClick={() => goTo([])}
              className="text-muted-foreground hover:text-foreground font-mono text-sm"
            >
              {t("MODELS.COMPARE.CLEAR")}
            </button>
          </div>
          <ComparisonTable
            models={selectedModels}
            rankMap={rankMap}
            perfMap={perfMap}
            onRemove={remove}
          />
        </>
      )}
    </div>
  );
}
