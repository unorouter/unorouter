"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  metadata: ModelMetadata;
  className?: string;
};

export function SupportedParameters(props: Props) {
  const t = useTranslations();
  const meta = props.metadata;

  const all = meta.supportedParametersAll ?? [];
  const intersection = new Set(meta.supportedParameters ?? []);
  const defaults = meta.defaultParameters ?? {};

  // Union of supportedParametersAll and any keys in defaultParameters not
  // already covered. Sorted alphabetically for stable display.
  const names = new Set<string>(all);
  for (const key of Object.keys(defaults)) names.add(key);
  const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));

  if (sorted.length === 0) return null;

  return (
    <div className={cn("overflow-x-auto", props.className)}>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground h-9 text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.PARAMETER")}
            </TableHead>
            <TableHead className="text-muted-foreground h-9 w-32 text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.ALWAYS_SUPPORTED")}
            </TableHead>
            <TableHead className="text-muted-foreground h-9 text-right text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.DEFAULT")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((name) => {
            const inIntersection = intersection.has(name);
            const hasDefault = name in defaults;
            const defaultValue = defaults[name];

            let defaultCell: React.ReactNode;
            if (!hasDefault) {
              defaultCell = <span className="text-muted-foreground/60">—</span>;
            } else if (defaultValue === null) {
              defaultCell = (
                <span className="text-muted-foreground/80 italic">
                  {t("MODELS.DETAIL.DO_NOT_SEND")}
                </span>
              );
            } else {
              defaultCell = String(defaultValue);
            }

            return (
              <TableRow key={name}>
                <TableCell className="py-2 font-mono text-xs">{name}</TableCell>
                <TableCell className="py-2">
                  {inIntersection ? (
                    <Icon
                      name="check"
                      className="h-3.5 w-3.5 text-emerald-500"
                      aria-label={t("MODELS.DETAIL.ALWAYS_SUPPORTED")}
                    />
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {defaultCell}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
