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
import { useLocale, useTranslations } from "next-intl";
import { KIND_LABEL } from "./consent-action";
import {
  CONSENT_KINDS,
  CONSENT_STATUSES,
  PRICE_KINDS,
  type ConsentRow,
} from "./consent-rows";
import type { useConsentFilters } from "./use-consent-filters";

const STATUS_LABEL = {
  given: msg("CONSENT.FILTER.GIVEN"),
  missing: msg("CONSENT.FILTER.MISSING"),
} satisfies Record<(typeof CONSENT_STATUSES)[number], ReturnType<typeof msg>>;

const PRICE_LABEL = {
  paid: msg("CONSENT.FILTER.PAID"),
  free: msg("CONSENT.FILTER.FREE"),
} satisfies Record<(typeof PRICE_KINDS)[number], ReturnType<typeof msg>>;

export function ConsentFilterSidebar(props: {
  rows: ConsentRow[];
  filters: ReturnType<typeof useConsentFilters>;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const params = props.filters.params;
  const setParams = props.filters.setParams;
  const countryOptions = [
    ...new Set(props.rows.flatMap((row) => row.countries)),
  ].sort((a, b) =>
    countryName(a, locale).localeCompare(countryName(b, locale)),
  );

  return (
    <FilterSidebarShell
      showReset={props.filters.activeFilterCount > 0}
      onReset={props.filters.reset}
    >
      <GroupShell label={t("CONSENT.FILTER.STATUS")}>
        {CONSENT_STATUSES.map((status) => (
          <CheckRow
            key={status}
            label={t(STATUS_LABEL[status])}
            checked={params.status.includes(status)}
            onToggle={() =>
              void setParams({ status: toggled(params.status, status) })
            }
          />
        ))}
      </GroupShell>
      <GroupShell label={t("CONSENT.FILTER.KIND")}>
        {CONSENT_KINDS.map((kind) => (
          <CheckRow
            key={kind}
            label={t(KIND_LABEL[kind])}
            checked={params.kind.includes(kind)}
            onToggle={() =>
              void setParams({ kind: toggled(params.kind, kind) })
            }
          />
        ))}
      </GroupShell>
      <GroupShell label={t("CONSENT.FILTER.PRICE")}>
        {PRICE_KINDS.map((price) => (
          <CheckRow
            key={price}
            label={t(PRICE_LABEL[price])}
            checked={params.price.includes(price)}
            onToggle={() =>
              void setParams({ price: toggled(params.price, price) })
            }
          />
        ))}
      </GroupShell>
      <MultiSelectGroup
        label={t("CONSENT.FILTER.COUNTRY")}
        options={countryOptions}
        value={params.country}
        onChange={(country) => void setParams({ country })}
        optionLabel={(code) => countryName(code, locale)}
      />
    </FilterSidebarShell>
  );
}
