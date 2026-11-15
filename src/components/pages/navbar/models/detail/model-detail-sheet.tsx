"use client";

import { EMPTY_METADATA } from "@/lib/api/model-modality";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { CopyButton } from "@/components/elements/code/copy-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { modelHref } from "@/lib/utils/base";
import { chooseChatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import type { EndpointInfo } from "@/lib/api/pricing";
import { useModelWatch } from "@/hooks/models/notify-hook";
import {
  useModelDetailQuery,
  useModelGroupsQuery,
} from "@/hooks/models/pricing-hook";
import { SectionHeading } from "./shared/section-heading";
import { env } from "@/lib/config/env";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { GridPricingTable } from "./pricing/grid-pricing-table";
import { PriceRows } from "./pricing/price-rows";
import { GroupPricingSection } from "./pricing/group-pricing-section";
import { ModelDescription } from "./header/model-description";
import { hasAnyParameter } from "./header/capability-helpers";
import { ModelHeaderChips, ModelMetaStats } from "./header/model-header-chips";
import { PerformanceSection } from "./tabs/performance-section";
import { UptimeSection } from "./tabs/uptime-section";
import { SupportedParameters } from "./tabs/supported-parameters";

type ModelDetailSheetProps = {
  model: { model_name: string } | null;
  endpointMap: Record<string, EndpointInfo>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function WatchButton(props: { modelName: string }) {
  const t = useTranslations();
  const watch = useModelWatch(props.modelName);

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "flex-1",
        watch.watched && "border-primary/40 text-primary",
      )}
      onClick={() => watch.toggle()}
    >
      <Icon name="bell" className="mr-2 h-3.5 w-3.5" />
      {watch.watched ? t("NOTIFY.UNWATCH") : t("NOTIFY.WATCH")}
    </Button>
  );
}

export function ModelDetailSheet(props: ModelDetailSheetProps) {
  const t = useTranslations();
  const setChatModel = useSetAtom(chooseChatModelAtom);
  const detailQuery = useModelDetailQuery(props.model?.model_name ?? null);
  const detail = detailQuery.data;
  const model = detail && {
    ...detail,
    metadata: detail.metadata ?? EMPTY_METADATA,
  };
  const groupsQuery = useModelGroupsQuery(props.model?.model_name ?? null);

  if (!model) return null;

  const theme = getVendorTheme(model.vendor);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-border border-b pb-4">
          <div className="flex items-center gap-3 pr-10">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${theme.bg} ${theme.border}`}
            >
              <VendorIcon vendor={model.vendor} size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 font-mono text-base tracking-wide">
                <span className="truncate">{model.model_name}</span>
                <CopyButton text={model.model_name} />
              </SheetTitle>
              <SheetDescription
                className={`font-mono text-[10px] tracking-wider uppercase ${theme.text}`}
              >
                {model.vendor}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              nativeButton={false}
              render={<Link href={modelHref(model.model_name, model.vendor)} />}
            >
              <Icon name="external-link" className="mr-2 h-3.5 w-3.5" />
              {t("MODELS.VIEW_DETAILS")}
            </Button>
            {model.chat && (
              <Button
                size="sm"
                className="flex-1"
                nativeButton={false}
                onClick={() => {
                  setChatModel(model.model_name);
                }}
                render={<Link href="/chat" />}
              >
                <Icon name="message-circle" className="mr-2 h-3.5 w-3.5" />
                {t("MODELS.OPEN_IN_CHAT")}
              </Button>
            )}
            <WatchButton modelName={model.model_name} />
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          <section>
            <SectionHeading theme={theme}>
              {t("MODELS.DETAIL.UPTIME")}
            </SectionHeading>
            <UptimeSection model={model.model_name} />
          </section>

          <section>
            <SectionHeading theme={theme}>
              {t("MODELS.DETAIL.PERFORMANCE")}
            </SectionHeading>
            <PerformanceSection modelName={model.model_name} />
          </section>

          {model.description && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.DESCRIPTION")}
              </SectionHeading>
              <ModelDescription text={model.description} />
            </section>
          )}

          <ModelHeaderChips metadata={model.metadata} />

          <ModelMetaStats metadata={model.metadata} />

          <section>
            <SectionHeading theme={theme}>
              {t("MODELS.DETAIL.PRICING")}
            </SectionHeading>
            <PriceRows model={model} theme={theme} />
          </section>

          {model.grid_pricing && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.GRID_PRICING")}
              </SectionHeading>
              <GridPricingTable
                rows={model.grid_pricing}
                multiplier={model.grid_min_ratio}
                priceLabel={t("MODELS.DETAIL.PRICING")}
              />
            </section>
          )}

          {model.enable_groups.length > 0 && !model.is_tiered && (
            <GroupPricingSection
              model={model}
              groupRatioMap={groupsQuery.data?.group_ratio ?? {}}
              autoGroups={groupsQuery.data?.auto_chain ?? []}
              groupProviders={groupsQuery.data?.group_providers ?? {}}
              theme={theme}
            />
          )}

          {hasAnyParameter(model.metadata) && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.SUPPORTED_PARAMETERS")}
              </SectionHeading>
              <SupportedParameters metadata={model.metadata} />
            </section>
          )}

          {model.supported_endpoint_types.length > 0 && (
            <section>
              <SectionHeading theme={theme}>
                {t("MODELS.DETAIL.ENDPOINTS")}
              </SectionHeading>
              <div className="space-y-2">
                {model.supported_endpoint_types.map((endpoint) => {
                  const info = props.endpointMap[endpoint];
                  const path = (info?.path ?? "").replaceAll(
                    "{model}",
                    model.model_name,
                  );
                  const fullUrl = path ? `${env.apiUrl ?? ""}${path}` : "";

                  return (
                    <div
                      key={endpoint}
                      className="border-border rounded border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span className="font-mono text-xs">{endpoint}</span>
                        </div>
                        {path && (
                          <span className="text-muted-foreground font-mono text-[10px] uppercase">
                            {info?.method ?? "POST"}
                          </span>
                        )}
                      </div>
                      {fullUrl && (
                        <div className="mt-1.5 flex items-start gap-1.5 pl-3.5">
                          <p className="text-muted-foreground font-mono text-[10px] break-all">
                            {fullUrl}
                          </p>
                          <CopyButton text={fullUrl} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <p className="text-muted-foreground/60 font-mono text-[10px] leading-relaxed italic">
            {t("MODELS.PRICE.VARIES_TOOLTIP")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
