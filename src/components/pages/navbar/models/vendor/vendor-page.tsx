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

export function VendorModelsPage(props: { vendor: string }) {
  const t = useTranslations();
  const query = usePricingVendorQuery(props.vendor);
  const target = vendorSlug(props.vendor);

  const models = (query.data ?? [])
    .filter((m) => vendorSlug(m.vendor.name) === target)
    .sort((a, b) => b.metadata.releaseTs - a.metadata.releaseTs);

  const display = vendorDisplayName(props.vendor);

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
        <h1 className="text-xl font-semibold tracking-tight">{display}</h1>
        <span className="text-muted-foreground text-sm">
          {t("MODELS.VENDOR.N_MODELS", { count: models.length })}
        </span>
      </div>

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <VendorModelCard key={model.name} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}
