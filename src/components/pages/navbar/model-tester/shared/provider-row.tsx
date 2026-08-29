"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { RankBar } from "./rank-bar";

export function ProviderRowBody(props: {
  vendor: string;
  name: string;
  lastTestedAt: Date | number;
  passRate: number;
  lowN?: boolean;
  latencyMs: number;
  meta: string;
}) {
  const t = useTranslations();
  return (
    <>
      <VendorIcon vendor={props.vendor} size={22} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium">{props.name}</span>
          <span className="text-foreground/70 shrink-0 text-xs">
            {t("MODEL_TESTER.RANKINGS.LAST_TESTED", {
              when: dayjs(props.lastTestedAt).fromNow(),
            })}
          </span>
        </div>
        <RankBar pct={Math.round(props.passRate * 100)} lowN={props.lowN} />
        <span className="text-muted-foreground truncate text-xs">
          <span className="font-mono tabular-nums">
            {Math.round(props.latencyMs)}ms
          </span>
          {" · "}
          {props.meta}
        </span>
      </div>
    </>
  );
}

export function StatCell(props: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-4 text-center">
      <span className="font-mono text-xl font-semibold tabular-nums">
        {props.value}
      </span>
      <span className="text-muted-foreground/80 text-[10px] font-medium tracking-widest uppercase">
        {props.label}
      </span>
    </div>
  );
}
