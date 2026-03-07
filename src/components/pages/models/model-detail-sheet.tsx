"use client";

import { VendorIcon } from "@/components/elements/vendor-icon";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EndpointInfo, ProcessedModel } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { getVendorTheme } from "@/lib/vendor-themes";
import { useTranslations } from "next-intl";
import { LuCopy, LuCheck, LuLink, LuInfo, LuTag } from "react-icons/lu";
import { useState } from "react";

type ModelDetailSheetProps = {
  model: ProcessedModel | null;
  endpointMap: Record<string, EndpointInfo>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  const str = price.toFixed(4);
  return `$${str.replace(/0+$/, "")}`;
}

function CopyButton(props: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(props.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <LuCheck className="h-3.5 w-3.5" /> : <LuCopy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function ModelDetailSheet(props: ModelDetailSheetProps) {
  const t = useTranslations();
  const model = props.model;

  if (!model) return null;

  const theme = getVendorTheme(model.vendor.name);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <VendorIcon vendor={model.vendor.name} size={28} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 font-mono text-base tracking-wide">
                <span className="truncate">{model.name}</span>
                <CopyButton text={model.name} />
              </SheetTitle>
              <SheetDescription className="font-mono text-[10px] tracking-wider uppercase">
                {model.vendor.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {/* Description */}
          {model.description && (
            <section>
              <SectionHeader
                icon={<LuInfo className="h-3.5 w-3.5 text-cyan-400" />}
                title={t("MODELS.DETAIL_DESCRIPTION")}
              />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {model.description}
              </p>
            </section>
          )}

          {/* Tags */}
          {model.tags.length > 0 && (
            <section>
              <SectionHeader
                icon={<LuTag className="h-3.5 w-3.5 text-purple-400" />}
                title={t("MODELS.DETAIL_TAGS")}
              />
              <div className="flex flex-wrap gap-1.5">
                {model.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] uppercase",
                      theme.tagBg,
                      theme.text,
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Pricing */}
          <section>
            <SectionHeader
              icon={<span className={cn("font-mono text-xs font-bold", theme.text)}>$</span>}
              title={t("MODELS.DETAIL_PRICING")}
            />
            <div className={cn("rounded-lg border p-4", theme.bg, theme.border)}>
              {model.isFixedPrice ? (
                <div className="flex items-baseline gap-2">
                  <span className={cn("font-mono text-lg font-bold", theme.text)}>
                    {formatPrice(model.fixedPrice)}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {t("MODELS.PRICE_PER_REQUEST")}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground font-mono text-[10px] uppercase">
                      {t("MODELS.PRICE_INPUT")}
                    </span>
                    <div className={cn("font-mono text-lg font-bold", theme.text)}>
                      {formatPrice(model.inputPrice)}
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {t("MODELS.PRICE_PER_MILLION")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-mono text-[10px] uppercase">
                      {t("MODELS.PRICE_OUTPUT")}
                    </span>
                    <div className={cn("font-mono text-lg font-bold", theme.text)}>
                      {formatPrice(model.outputPrice)}
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {t("MODELS.PRICE_PER_MILLION")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* API Endpoints */}
          {model.endpointTypes.length > 0 && (
            <section>
              <SectionHeader
                icon={<LuLink className="h-3.5 w-3.5 text-green-400" />}
                title={t("MODELS.DETAIL_ENDPOINTS")}
              />
              <div className="space-y-2">
                {model.endpointTypes.map((endpoint) => {
                  const info = props.endpointMap[endpoint];
                  let path = info?.path ?? "";
                  if (path.includes("{model}")) {
                    path = path.replaceAll("{model}", model.name);
                  }
                  const method = info?.method ?? "POST";

                  return (
                    <div
                      key={endpoint}
                      className="border-border flex items-center justify-between rounded border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="font-mono text-xs">{endpoint}</span>
                        {path && (
                          <span className="text-muted-foreground font-mono text-[10px] break-all">
                            {path}
                          </span>
                        )}
                      </div>
                      {path && (
                        <span className="text-muted-foreground font-mono text-[10px] uppercase">
                          {method}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader(props: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {props.icon}
      <span className="text-foreground font-mono text-xs tracking-wider uppercase">
        {props.title}
      </span>
    </div>
  );
}
