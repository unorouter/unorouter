"use client";

import { countryName } from "@/components/elements/model/group-data-policy";
import {
  CheckRow,
  GroupShell,
  MultiSelectGroup,
} from "@/components/pages/navbar/models/filters/filter-groups";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { msg } from "@/lib/config/constants";
import type { ProviderConsentItem } from "@/openapi";
import { useLocale, useTranslations } from "next-intl";
import { PROVIDER_STATUSES, type ProviderStatus } from "./provider-rows";
import type { useProviderFilters } from "./use-provider-filters";

const STATUS_LABEL = {
  given: msg("CONSENT.FILTER.GIVEN"),
  missing: msg("CONSENT.FILTER.MISSING"),
} satisfies Record<ProviderStatus, ReturnType<typeof msg>>;

export function ProviderFilterSidebar(props: {
  providers: ProviderConsentItem[];
  filters: ReturnType<typeof useProviderFilters>;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const params = props.filters.params;
  const setParams = props.filters.setParams;
  const countryOptions = [
    ...new Set(props.providers.map((p) => p.country)),
  ].sort((a, b) =>
    countryName(a, locale).localeCompare(countryName(b, locale)),
  );

  return (
    <Sidebar
      collapsible="offcanvas"
      className="absolute! inset-y-0 h-full! bg-transparent"
    >
      <div className="sticky top-14 flex max-h-[calc(100svh-3.5rem)] flex-col">
        <SidebarHeader className="flex-row items-center justify-between px-3 py-2">
          <span className="font-mono text-sm font-medium">
            {t("MODELS.FILTER.TITLE")}
          </span>
          {props.filters.activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.filters.reset}
              className="h-7 px-2"
            >
              {t("MODELS.FILTER.RESET")}
              <Icon name="x" className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </SidebarHeader>
        <SidebarContent className="gap-4 overflow-y-auto px-3 py-2">
          <GroupShell label={t("PROVIDER_CONSENT.FILTER.ACTIVITY")}>
            <CheckRow
              label={t("PROVIDER_CONSENT.FILTER.ACTIVE_ONLY")}
              checked={params.pactive}
              onToggle={() => void setParams({ pactive: !params.pactive })}
            />
          </GroupShell>
          <GroupShell label={t("CONSENT.FILTER.STATUS")}>
            {PROVIDER_STATUSES.map((status) => (
              <CheckRow
                key={status}
                label={t(STATUS_LABEL[status])}
                checked={params.pstatus.includes(status)}
                onToggle={() =>
                  void setParams({
                    pstatus: params.pstatus.includes(status)
                      ? params.pstatus.filter((s) => s !== status)
                      : [...params.pstatus, status],
                  })
                }
              />
            ))}
          </GroupShell>
          <MultiSelectGroup
            label={t("PROVIDER_CONSENT.TABLE.COUNTRY")}
            options={countryOptions}
            value={params.pcountry}
            onChange={(pcountry) => void setParams({ pcountry })}
            optionLabel={(code) => countryName(code, locale)}
          />
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
