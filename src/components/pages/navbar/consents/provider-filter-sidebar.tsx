"use client";

import { countryName } from "@/components/elements/model/group-data-policy";
import {
  CheckRow,
  GroupShell,
  MultiSelectGroup,
  FilterSidebarShell,
  toggled,
} from "@/components/pages/navbar/models/filters/filter-groups";
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
    <FilterSidebarShell
      showReset={props.filters.activeFilterCount > 0}
      onReset={props.filters.reset}
    >
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
              void setParams({ pstatus: toggled(params.pstatus, status) })
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
    </FilterSidebarShell>
  );
}
