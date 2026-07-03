"use client";

import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  metadata: ModelMetadata;
  className?: string;
};

// Rows = union of params any provider serving this model accepts; the badge says whether that
// holds for every provider (intersection) or depends on routing.
export function SupportedParameters(props: Props) {
  const t = useTranslations();
  const meta = props.metadata;
  const intersection = new Set(meta.supportedParameters ?? []);
  const defaults = meta.defaultParameters ?? {};
  const names = [
    ...new Set([
      ...(meta.supportedParametersAll ?? []),
      ...Object.keys(defaults),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  if (names.length === 0) return null;

  return (
    <div className={cn("overflow-x-auto", props.className)}>
      <p className="text-muted-foreground mb-2 text-xs">
        {t("MODELS.DETAIL.PARAMS_HINT")}
      </p>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground h-9 text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.PARAMETER")}
            </TableHead>
            <TableHead className="text-muted-foreground h-9 w-40 text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.SUPPORT_HEADER")}
            </TableHead>
            <TableHead className="text-muted-foreground h-9 text-right text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.DEFAULT")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {names.map((name) => {
            const hasDefault = name in defaults;
            const defaultValue = defaults[name];
            return (
              <TableRow key={name}>
                <TableCell className="py-2 font-mono text-xs">{name}</TableCell>
                <TableCell className="py-2">
                  {intersection.has(name) ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
                      {t("MODELS.DETAIL.SUPPORT_ALL")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Icon
                        name="circle-dashed"
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      {t("MODELS.DETAIL.SUPPORT_SOME")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {!hasDefault ? (
                    <span className="text-muted-foreground/60">-</span>
                  ) : defaultValue === null ? (
                    <span className="text-muted-foreground/80 italic">
                      {t("MODELS.DETAIL.NOT_SENT")}
                    </span>
                  ) : (
                    String(defaultValue)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
