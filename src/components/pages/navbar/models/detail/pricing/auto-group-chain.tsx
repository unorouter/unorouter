"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  enableGroups: string[];
  autoGroups: string[];
  groupRatioMap?: Record<string, number>;
  className?: string;
};

export function AutoGroupChain(props: Props) {
  const t = useTranslations();
  const enabled = new Set(props.enableGroups);
  const ratios = props.groupRatioMap;
  const chain = props.autoGroups.filter((g) => enabled.has(g));
  if (ratios)
    chain.sort((a, b) => (ratios[a] ?? Infinity) - (ratios[b] ?? Infinity));

  if (chain.length === 0) return null;

  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1",
        props.className,
      )}
    >
      <span className="font-mono text-[10px] tracking-wider uppercase">
        {t("MODELS.DETAIL.AUTO_CHAIN")}
      </span>
      {chain.map((group, idx) => (
        <span key={group} className="flex items-center gap-1">
          <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
            {group}
          </span>
          {idx < chain.length - 1 && (
            <span className="text-muted-foreground/40 font-mono text-[10px]">
              {">"}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
