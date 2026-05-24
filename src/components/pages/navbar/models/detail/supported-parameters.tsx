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

  const doNotSendLabel = t("MODELS.DETAIL.DO_NOT_SEND");
  const alwaysSupportedLabel = t("MODELS.DETAIL.ALWAYS_SUPPORTED");

  return (
    <div className={cn("overflow-x-auto", props.className)}>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground h-9 text-[10px] tracking-wider uppercase">
              {t("MODELS.DETAIL.PARAMETER")}
            </TableHead>
            <TableHead className="text-muted-foreground h-9 w-32 text-[10px] tracking-wider uppercase">
              {alwaysSupportedLabel}
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
                    <Icon
                      name="check"
                      className="h-3.5 w-3.5 text-emerald-500"
                      aria-label={alwaysSupportedLabel}
                    />
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {!hasDefault ? (
                    <span className="text-muted-foreground/60">-</span>
                  ) : defaultValue === null ? (
                    <span className="text-muted-foreground/80 italic">
                      {doNotSendLabel}
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
