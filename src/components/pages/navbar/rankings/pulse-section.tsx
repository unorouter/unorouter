"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import type { RankingMover } from "@/lib/api/typebox/rankings";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  LuArrowDownRight,
  LuArrowUpRight,
  LuTrendingDown,
  LuTrendingUp,
} from "react-icons/lu";
import { ModelLink, VendorLink } from "./entity-links";

type PulseSectionProps = {
  movers: RankingMover[];
  droppers: RankingMover[];
};

export function PulseSection(props: PulseSectionProps) {
  const t = useTranslations();

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PulseCard
        title={t("RANKINGS.PULSE.UP_TITLE")}
        description={t("RANKINGS.PULSE.UP_SUBTITLE")}
        icon={<LuTrendingUp className="size-4 text-emerald-500" />}
      >
        {props.movers.length === 0 ? (
          <PulseEmpty label={t("RANKINGS.PULSE.UP_EMPTY")} />
        ) : (
          <ul>
            {props.movers.map((row) => (
              <MoverRow key={row.model_name} row={row} intent="up" />
            ))}
          </ul>
        )}
      </PulseCard>

      <PulseCard
        title={t("RANKINGS.PULSE.DOWN_TITLE")}
        description={t("RANKINGS.PULSE.DOWN_SUBTITLE")}
        icon={<LuTrendingDown className="size-4 text-rose-500" />}
      >
        {props.droppers.length === 0 ? (
          <PulseEmpty label={t("RANKINGS.PULSE.DOWN_EMPTY")} />
        ) : (
          <ul>
            {props.droppers.map((row) => (
              <MoverRow key={row.model_name} row={row} intent="down" />
            ))}
          </ul>
        )}
      </PulseCard>
    </section>
  );
}

function PulseCard(props: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <header className="border-b px-4 py-3">
        <h3 className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
          {props.icon}
          {props.title}
        </h3>
        <p className="text-muted-foreground/80 mt-0.5 text-xs">
          {props.description}
        </p>
      </header>
      <div className="py-1">{props.children}</div>
    </div>
  );
}

function PulseEmpty(props: { label: string }) {
  return (
    <div className="text-muted-foreground/80 px-4 py-6 text-center text-xs">
      {props.label}
    </div>
  );
}

function MoverRow(props: { row: RankingMover; intent: "up" | "down" }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="shrink-0">
        <VendorIcon vendor={props.row.vendor} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <ModelLink
          modelName={props.row.model_name}
          className="text-foreground block truncate font-mono text-xs font-medium"
        >
          {props.row.model_name}
        </ModelLink>
        <p className="text-muted-foreground/80 truncate text-[11px]">
          #{props.row.current_rank}
          {" / "}
          <VendorLink vendor={props.row.vendor}>
            {props.row.vendor.toLowerCase()}
          </VendorLink>
        </p>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 font-mono text-xs font-semibold tabular-nums",
          props.intent === "up"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        {props.intent === "up" ? (
          <LuArrowUpRight className="size-3" />
        ) : (
          <LuArrowDownRight className="size-3" />
        )}
        {Math.abs(props.row.rank_delta)}
      </span>
    </li>
  );
}
