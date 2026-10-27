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
  given: msg("FREE_CONSENT.FILTER.GIVEN"),
  missing: msg("FREE_CONSENT.FILTER.MISSING"),
} satisfies Record<(typeof CONSENT_STATUSES)[number], ReturnType<typeof msg>>;

const PRICE_LABEL = {
  paid: msg("FREE_CONSENT.FILTER.PAID"),
  free: msg("FREE_CONSENT.FILTER.FREE"),
} satisfies Record<(typeof PRICE_KINDS)[number], ReturnType<typeof msg>>;

function toggled<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

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
          <GroupShell label={t("FREE_CONSENT.FILTER.STATUS")}>
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
          <GroupShell label={t("FREE_CONSENT.FILTER.KIND")}>
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
          <GroupShell label={t("FREE_CONSENT.FILTER.PRICE")}>
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
            label={t("FREE_CONSENT.FILTER.COUNTRY")}
            options={countryOptions}
            value={params.country}
            onChange={(country) => void setParams({ country })}
            optionLabel={(code) => countryName(code, locale)}
          />
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
