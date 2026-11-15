"use client";

import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FLAG_LOADERS } from "@/lib/config/flag-loaders";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import type { OwnPurposeSummary } from "@/openapi";
import type {
  GroupDataPolicy,
  TransferBasis,
} from "@/lib/validation/data-policy";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// Fetched on first sight; the whole 3x2 set is ~150KB gzipped.
const flagSvgs = new Map<string, string>();

async function loadFlag(code: string): Promise<string | null> {
  const cached = flagSvgs.get(code);
  if (cached) return cached;
  const load = Object.hasOwn(FLAG_LOADERS, code) ? FLAG_LOADERS[code] : null;
  if (!load) return null;
  const mod = await load();
  flagSvgs.set(code, mod.default);
  return mod.default;
}

export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const SAFE_BASIS_KEY = {
  adequacy: "MODELS.DATA_POLICY.BASIS_ADEQUACY",
  dpf: "MODELS.DATA_POLICY.BASIS_DPF",
  scc: "MODELS.DATA_POLICY.BASIS_SCC",
} as const satisfies Partial<Record<TransferBasis, string>>;

function isSafeBasis(
  transfer: string | undefined,
): transfer is keyof typeof SAFE_BASIS_KEY {
  return transfer !== undefined && transfer in SAFE_BASIS_KEY;
}

function Hint(props: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={props.label}
            className="inline-flex shrink-0 cursor-help items-center"
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  );
}

// Colour is important-flagged: command lists recolour every svg in the highlighted row.
function PolicyIcon(props: { name: IconName; className: string }) {
  return (
    <Icon
      name={props.name}
      aria-hidden
      className={cn("h-3 w-3", props.className)}
    />
  );
}

function CountryFlag(props: { code: string }) {
  const [flag, setFlag] = useState<{ code: string; svg: string } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadFlag(props.code)
      .then((svg) => {
        if (alive && svg) setFlag({ code: props.code, svg });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [props.code]);

  if (!Object.hasOwn(FLAG_LOADERS, props.code))
    return (
      <span className="text-muted-foreground font-mono text-[9px] leading-none">
        {props.code}
      </span>
    );
  return (
    <span
      aria-hidden
      className="bg-muted inline-block h-2.5 w-[15px] shrink-0 rounded-[2px] bg-cover bg-center"
      style={
        flag?.code === props.code
          ? {
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(flag.svg)}")`,
            }
          : undefined
      }
    />
  );
}

/**
 * Seat flag plus data-protection hints for one provider group. Silence is never
 * read as safe: the EU indicator needs an explicit transfer basis, and a group
 * without any recorded data gets an "unknown" hint instead of nothing.
 */
export function GroupDataPolicyBadges(props: {
  policy: GroupDataPolicy | undefined;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const policy = props.policy;
  const code =
    policy?.seat_country && /^[A-Z]{2}$/.test(policy.seat_country)
      ? policy.seat_country
      : null;
  const country = code ? countryName(code, locale) : null;
  const unsafe = policy?.unsafe_third_country === true;
  const prompts = policy?.prompts;
  const transfer = policy?.transfer;
  const safe = !unsafe && isSafeBasis(transfer);
  const known =
    !!code ||
    unsafe ||
    (prompts !== undefined && prompts !== "unknown") ||
    (transfer !== undefined && transfer !== "unknown");

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", props.className)}
    >
      {code && country && (
        <Hint label={t("MODELS.DATA_POLICY.SEAT", { country })}>
          <CountryFlag code={code} />
        </Hint>
      )}
      {unsafe && (
        <Hint
          label={
            country
              ? t("MODELS.DATA_POLICY.UNSAFE_COUNTRY", { country })
              : t("MODELS.DATA_POLICY.UNSAFE")
          }
        >
          <PolicyIcon name="triangle-alert" className="text-destructive!" />
        </Hint>
      )}
      {prompts === "trains" && (
        <Hint label={t("MODELS.DATA_POLICY.TRAINS")}>
          <PolicyIcon name="brain" className="text-warning!" />
        </Hint>
      )}
      {prompts === "retains" && (
        <Hint label={t("MODELS.DATA_POLICY.RETAINS")}>
          <PolicyIcon name="database" className="text-warning!" />
        </Hint>
      )}
      {safe && (
        <Hint
          label={t("MODELS.DATA_POLICY.SAFEGUARDS", {
            basis: t(SAFE_BASIS_KEY[transfer]),
          })}
        >
          <PolicyIcon name="shield-check" className="text-success!" />
        </Hint>
      )}
      {!known && (
        <Hint label={t("MODELS.DATA_POLICY.UNKNOWN")}>
          <PolicyIcon
            name="circle-help"
            className="text-muted-foreground/50!"
          />
        </Hint>
      )}
    </span>
  );
}

// Model-level notice before a model is chosen: at least one provider behind it
// trains on or retains inputs.
export function OwnPurposeBadge(props: {
  ownPurpose: OwnPurposeSummary | undefined;
  className?: string;
}) {
  const t = useTranslations();
  if (!props.ownPurpose?.trains_or_retains) return null;
  return (
    <OwnPurposeHint
      label={t("MODELS.DATA_POLICY.OWN_PURPOSE")}
      className={props.className}
    />
  );
}

function OwnPurposeHint(props: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", props.className)}>
      <Hint label={props.label}>
        <PolicyIcon name="brain" className="text-warning!" />
      </Hint>
    </span>
  );
}

// Destination countries as flags, each named in its tooltip.
export function CountryFlags(props: { codes: string[]; className?: string }) {
  const locale = useLocale();
  if (props.codes.length === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1",
        props.className,
      )}
    >
      {props.codes.map((code) => (
        <Hint key={code} label={countryName(code, locale)}>
          <CountryFlag code={code} />
        </Hint>
      ))}
    </span>
  );
}
