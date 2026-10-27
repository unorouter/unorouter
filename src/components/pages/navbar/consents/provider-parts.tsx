"use client";

import {
  providerName,
  providerPractice,
  type Practice,
} from "@/lib/api/provider-consent";
import {
  countryName,
  GroupDataPolicyBadges,
} from "@/components/elements/model/group-data-policy";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { msg } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";
import {
  isSelectable,
  providerModels,
  type ProviderRow,
} from "./provider-rows";

const REASON_LABEL = {
  safe_country: msg("PROVIDER_CONSENT.REASON.SAFE_COUNTRY"),
  no_own_purpose: msg("PROVIDER_CONSENT.REASON.NO_OWN_PURPOSE"),
} as const;

function isReason(reason: string): reason is keyof typeof REASON_LABEL {
  return Object.hasOwn(REASON_LABEL, reason);
}

function reasonLabel(reason: string) {
  return isReason(reason)
    ? REASON_LABEL[reason]
    : msg("FREE_CONSENT.NOT_NEEDED");
}

export type ProviderHandlers = {
  open: (alias: string) => void;
  revoke: (alias: string) => void;
  revoking: boolean;
};

export type ProviderSelection = {
  selected: ReadonlySet<string>;
  toggle: (alias: string, on: boolean) => void;
  // Every selectable provider of the current filter at once.
  all: boolean;
  setAll: (on: boolean) => void;
};

export function ProviderSelectAll(props: { selection: ProviderSelection }) {
  const t = useTranslations();
  return (
    <Checkbox
      aria-label={t("PROVIDER_CONSENT.SELECT.ALL")}
      checked={props.selection.all}
      onCheckedChange={(on) => props.selection.setAll(on)}
    />
  );
}

// Rows that cannot be granted keep the slot so the columns stay aligned.
export function ProviderSelect(props: {
  provider: ProviderRow;
  selection: ProviderSelection;
}) {
  const t = useTranslations();
  const p = props.provider;
  if (!isSelectable(p)) return <span className="block size-4 shrink-0" />;
  return (
    <span className="flex" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        aria-label={t("PROVIDER_CONSENT.SELECT.ONE", {
          provider: providerName(p),
        })}
        checked={props.selection.selected.has(p.alias)}
        onCheckedChange={(on) => props.selection.toggle(p.alias, on)}
      />
    </span>
  );
}

export function ProviderName(props: { provider: ProviderRow }) {
  const t = useTranslations();
  const p = props.provider;
  const tags = p.tags ?? [];
  const name = providerName(p);
  // The label already lists short tag sets; collapsed families get the full
  // list on hover.
  const collapsed = tags.length > 0 && name !== tags.join(", ");
  return (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="cursor-help truncate font-mono text-xs font-medium underline decoration-dotted underline-offset-4 lg:text-sm" />
            }
          >
            {name}
          </TooltipTrigger>
          <TooltipContent className="max-w-80 font-mono text-xs">
            {tags.join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="truncate font-mono text-xs font-medium lg:text-sm">
          {name}
        </span>
      )}
      <GroupDataPolicyBadges
        policy={{
          seat_country: p.country,
          // A safe seat that passes inputs on is not an unsafe seat country.
          unsafe_third_country: p.unsafe && !p.onward_unvetted,
        }}
      />
      <PracticeBadge provider={p} />
      {!p.active && (
        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          {t("PROVIDER_CONSENT.INACTIVE")}
        </Badge>
      )}
    </span>
  );
}

const PRACTICE_LABEL = {
  trains: msg("PROVIDER_CONSENT.PRACTICE.TRAINS"),
  retains: msg("PROVIDER_CONSENT.PRACTICE.RETAINS"),
  unknown: msg("PROVIDER_CONSENT.PRACTICE.UNKNOWN"),
} satisfies Record<Practice, ReturnType<typeof msg>>;

const PRACTICE_HINT = {
  trains: msg("PROVIDER_CONSENT.PRACTICE_HINT.TRAINS"),
  retains: msg("PROVIDER_CONSENT.PRACTICE_HINT.RETAINS"),
  unknown: msg("PROVIDER_CONSENT.PRACTICE_HINT.UNKNOWN"),
} satisfies Record<Practice, ReturnType<typeof msg>>;

// A provider that needs no consent because it keeps nothing has no badge.
function PracticeBadge(props: { provider: ProviderRow }) {
  const t = useTranslations();
  if (props.provider.reason === "no_own_purpose") return null;
  const practice = providerPractice(props.provider);
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-4 px-1 text-[10px]",
        practice === "unknown" ? "text-muted-foreground" : "text-warning",
      )}
      title={t(PRACTICE_HINT[practice])}
    >
      {t(PRACTICE_LABEL[practice])}
    </Badge>
  );
}

export function ProviderCountry(props: { provider: ProviderRow }) {
  const t = useTranslations();
  const locale = useLocale();
  const p = props.provider;
  const risk = p.onward_unvetted
    ? t("PROVIDER_CONSENT.ONWARD_UNVETTED")
    : p.unsafe
      ? t("PROVIDER_CONSENT.UNSAFE_NOTE")
      : null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      <span>{countryName(p.country, locale)}</span>
      {risk && (
        <span className="text-destructive truncate text-xs" title={risk}>
          {risk}
        </span>
      )}
    </span>
  );
}

// One short line; lanes and the model list sit in the expanded row.
export function ProviderCounts(props: { provider: ProviderRow }) {
  const t = useTranslations();
  const p = props.provider;
  if (p.reason) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="text-muted-foreground text-xs whitespace-nowrap">
      {t("PROVIDER_CONSENT.COUNTS_SHORT", {
        activeModels: p.active_model_count,
        models: p.model_count,
        activeChannels: p.active_channel_count,
        channels: p.channel_count,
      })}
    </span>
  );
}

function ModelVendorIcon(props: { vendor: string | undefined }) {
  if (!props.vendor) return <span className="size-3 shrink-0" />;
  return <VendorIcon vendor={props.vendor} size={12} />;
}

export function ProviderDetails(props: { provider: ProviderRow }) {
  const t = useTranslations();
  const p = props.provider;
  const catalog = usePricingCatalogQuery().data?.models;
  if (p.reason) return null;
  const vendorOf = new Map(catalog?.map((m) => [m.model_name, m.vendor]));
  const vendorKey = (name: string) => vendorOf.get(name) || "\uffff";
  const models = [...providerModels(p)].sort((a, b) =>
    vendorKey(a.name).localeCompare(vendorKey(b.name)),
  );
  return (
    <div className="space-y-2 px-4 py-3">
      <p className="text-muted-foreground text-xs">
        {[
          t("PROVIDER_CONSENT.MODELS_ACTIVE", {
            active: p.active_model_count,
            count: p.model_count,
          }),
          t("PROVIDER_CONSENT.CHANNELS_ACTIVE", {
            active: p.active_channel_count,
            count: p.channel_count,
          }),
          t("PROVIDER_CONSENT.LANES_ACTIVE", {
            active: p.active_lane_count,
            count: p.lane_count,
          }),
        ].join(", ")}
      </p>
      <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <li
            key={model.name}
            className={cn(
              "flex items-center gap-1.5 truncate font-mono text-xs",
              !model.active && "text-muted-foreground/60",
            )}
          >
            <ModelVendorIcon vendor={vendorOf.get(model.name)} />
            <span className="truncate">{model.name}</span>
            {model.channels > 0 && (
              <span className="text-muted-foreground shrink-0 font-sans text-[10px]">
                {model.active_channels}/{model.channels}
              </span>
            )}
            {!model.active && (
              <span className="shrink-0 font-sans text-[10px]">
                {t("PROVIDER_CONSENT.INACTIVE")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProviderStatusBadge(props: { provider: ProviderRow }) {
  const t = useTranslations();
  const p = props.provider;
  if (p.reason)
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Badge variant="outline" className="text-muted-foreground text-[10px]">
          {t("FREE_CONSENT.NOT_NEEDED")}
        </Badge>
        <span className="text-muted-foreground text-[10px]">
          {t(reasonLabel(p.reason))}
        </span>
      </span>
    );
  if (p.status === "given")
    return (
      <Badge
        variant="secondary"
        className="text-[10px]"
        title={
          p.given_at
            ? t("FREE_CONSENT.GRANTED_ON", { date: formatLongDate(p.given_at) })
            : undefined
        }
      >
        {t("FREE_CONSENT.FILTER.GIVEN")}
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[10px]">
      {t("FREE_CONSENT.FILTER.MISSING")}
    </Badge>
  );
}

export function ProviderAction(props: {
  provider: ProviderRow;
  handlers: ProviderHandlers;
}) {
  const t = useTranslations();
  const alias = props.provider.alias;
  if (props.provider.reason) return null;
  // The row toggles its details on click; the button must not.
  if (props.provider.status === "given")
    return (
      <Button
        variant="outline"
        size="xs"
        onClick={(e) => {
          e.stopPropagation();
          props.handlers.revoke(alias);
        }}
        disabled={props.handlers.revoking}
      >
        {t("FREE_CONSENT.REVOKE_BUTTON")}
      </Button>
    );
  return (
    <Button
      size="xs"
      onClick={(e) => {
        e.stopPropagation();
        props.handlers.open(alias);
      }}
    >
      {t("FREE_CONSENT.GIVE")}
    </Button>
  );
}
