"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { usePricingVendorQuery } from "@/hooks/models/pricing-hook";
import { vendorDisplayName } from "@/lib/api/pricing";
import { vendorSlug } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { VendorModelCard } from "./vendor-model-card";
import { APP_VALUES } from "@/lib/config/constants";
import { COMPARE_PAIRS } from "@/components/pages/navbar/models/compare/compare-pairs";
import { modelSlug } from "@/lib/utils/base";

export function VendorModelsPage(props: { vendor: string }) {
  const t = useTranslations();
  const query = usePricingVendorQuery(props.vendor);
  const target = vendorSlug(props.vendor);

  const models = (query.data ?? []).filter(
    (m) => vendorSlug(m.vendor) === target,
  );
  // Split rather than interleave: the catalog sorts by release date, so without
  // this a dead model lands above a working one. Both stay on the page, because
  // a model page nothing links to is a model page Google never crawls.
  const live = models.filter((m) => m.online);
  const busy = models.filter((m) => !m.online);

  const display = vendorDisplayName(props.vendor);
  // Curated compare pages for this vendor's models, which otherwise only the
  // model pages and /compare reach.
  const names = new Set(models.map((m) => m.model_name));
  const pairs = COMPARE_PAIRS.filter((pair) => pair.some((n) => names.has(n)));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/models" />}
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </Button>
        <VendorIcon vendor={props.vendor} size={32} />
        <h1 className="text-xl font-semibold tracking-tight">
          {t("MODELS.VENDOR.META_TITLE", { ...APP_VALUES, vendor: display })}
        </h1>
        <span className="text-muted-foreground text-sm">
          {t("MODELS.VENDOR.N_MODELS", { count: models.length })}
        </span>
      </div>
      <p className="text-muted-foreground -mt-2 mb-6 text-sm">
        {t("MODELS.VENDOR.META_DESC", { ...APP_VALUES, vendor: display })}
      </p>

      {models.length === 0 ? (
        query.isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border-border/50 bg-muted/20 h-28 animate-pulse rounded-lg border"
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-16 text-center text-sm">
            {t("MODELS.VENDOR.EMPTY")}
          </p>
        )
      ) : (
        <>
          {live.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((model) => (
                <VendorModelCard key={model.model_name} model={model} />
              ))}
            </div>
          )}

          {busy.length > 0 && (
            <section className={live.length > 0 ? "mt-10" : undefined}>
              <h2 className="text-muted-foreground mb-1 text-sm font-bold tracking-wider uppercase">
                {t("MODELS.VENDOR.AT_CAPACITY_HEADING")}
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("MODELS.VENDOR.AT_CAPACITY_NOTE")}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {busy.map((model) => (
                  <VendorModelCard key={model.model_name} model={model} />
                ))}
              </div>
            </section>
          )}

          {pairs.length > 0 && (
            <section className="mt-10">
              <h2 className="text-muted-foreground mb-3 text-sm font-bold tracking-wider uppercase">
                {t("MODELS.COMPARE.POPULAR")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {pairs.map((pair) => (
                  <Link
                    key={pair.join("|")}
                    href={{
                      pathname: "/compare/[...slugs]",
                      params: { slugs: pair.map((n) => modelSlug(n)).sort() },
                    }}
                    prefetch={false}
                    className="hover:bg-muted/50 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors"
                  >
                    {pair[0]} vs {pair[1]}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
