"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Link } from "@/i18n/navigation";
import type { PricingCatalogModel } from "@/openapi";
import { modelSlug } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { COMPARE_PAIRS } from "./compare-pairs";

export function PopularPairs(props: { models: PricingCatalogModel[] }) {
  const t = useTranslations();
  const byName = new Map(props.models.map((m) => [m.model_name, m]));

  const pairs = COMPARE_PAIRS.map(([a, b]) => ({
    a: byName.get(a),
    b: byName.get(b),
  })).filter(
    (p): p is { a: PricingCatalogModel; b: PricingCatalogModel } =>
      Boolean(p.a) && Boolean(p.b),
  );

  if (pairs.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-sm font-semibold tracking-tight">
        {t("MODELS.COMPARE.POPULAR")}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((pair) => (
          <Link
            key={`${pair.a.model_name}-${pair.b.model_name}`}
            href={{
              pathname: "/compare/[...slugs]",
              params: {
                slugs: [
                  modelSlug(pair.a.model_name),
                  modelSlug(pair.b.model_name),
                ],
              },
            }}
            className="border-border hover:border-primary/50 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
          >
            <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              <VendorIcon vendor={pair.a.vendor} size={14} />
            </span>
            <span className="truncate font-mono text-xs">
              {pair.a.model_name}
            </span>
            <span className="text-muted-foreground shrink-0">vs</span>
            <span className="truncate font-mono text-xs">
              {pair.b.model_name}
            </span>
            <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              <VendorIcon vendor={pair.b.vendor} size={14} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
