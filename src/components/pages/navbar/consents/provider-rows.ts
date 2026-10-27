import { countryName } from "@/components/elements/model/group-data-policy";
import { sortByKeys } from "@/lib/api/model-sort";
import { providerName } from "@/lib/api/provider-consent";
import type { ProviderConsentItem, ProviderOtherItem } from "@/openapi";

export const PROVIDER_STATUSES = ["given", "missing"] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const PROVIDER_SORT_VALUES = [
  "activeFirst",
  "activeChannelsDesc",
  "activeModelsDesc",
  "activeLanesDesc",
  "modelsDesc",
  "name",
  "country",
] as const;
export type ProviderSort = (typeof PROVIDER_SORT_VALUES)[number];
export const DEFAULT_PROVIDER_SORT: readonly ProviderSort[] = [
  "activeFirst",
  "activeChannelsDesc",
  "activeModelsDesc",
  "activeLanesDesc",
];

export type ProviderModel = {
  name: string;
  active: boolean;
  channels: number;
  active_channels: number;
};

// model_details is newer than models; a gateway without it lists names only.
// Most active channels first, then active, then by name.
export function providerModels(
  p: Pick<ProviderConsentItem, "model_details" | "models">,
): ProviderModel[] {
  const details: ProviderModel[] =
    p.model_details && p.model_details.length > 0
      ? p.model_details
      : (p.models ?? []).map((name) => ({
          name,
          active: true,
          channels: 0,
          active_channels: 0,
        }));
  return [...details].sort(
    (a, b) =>
      b.active_channels - a.active_channels ||
      Number(b.active) - Number(a.active) ||
      a.name.localeCompare(b.name),
  );
}

// Only a provider still waiting for consent can join a batch grant.
export function isSelectable(p: ProviderRow): boolean {
  return !p.reason && p.status === "missing";
}

export function sortProviders(
  items: ProviderConsentItem[],
  keys: readonly ProviderSort[],
  locale: string,
): ProviderConsentItem[] {
  return sortByKeys(
    items,
    keys,
    (key, a, b) => {
      if (key === "activeFirst") return Number(b.active) - Number(a.active);
      if (key === "activeChannelsDesc")
        return b.active_channel_count - a.active_channel_count;
      if (key === "activeModelsDesc")
        return b.active_model_count - a.active_model_count;
      if (key === "activeLanesDesc")
        return b.active_lane_count - a.active_lane_count;
      if (key === "modelsDesc") return b.model_count - a.model_count;
      if (key === "country")
        return countryName(a.country, locale).localeCompare(
          countryName(b.country, locale),
        );
      return providerName(a).localeCompare(providerName(b));
    },
    (a, b) => providerName(a).localeCompare(providerName(b)),
  );
}

// A provider of the model that needs no consent shares the table; `reason`
// says why, and it has no counts, models or action.
export type ProviderRow = Omit<ProviderConsentItem, "status"> & {
  status: ProviderConsentItem["status"] | "not_needed";
  reason?: string;
};

export function otherProviderRow(o: ProviderOtherItem): ProviderRow {
  return {
    alias: `other:${o.label}:${o.country}`,
    label: o.label,
    country: o.country,
    unsafe: o.unsafe,
    onward_unvetted: o.onward_unvetted,
    active: o.active,
    trains_or_retains: o.reason === "safe_country",
    practice: o.practice,
    status: "not_needed",
    reason: o.reason,
    tags: [],
    models: [],
    model_details: [],
    model_count: 0,
    active_model_count: 0,
    lane_count: 0,
    active_lane_count: 0,
    channel_count: 0,
    active_channel_count: 0,
  };
}
