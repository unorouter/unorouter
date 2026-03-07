"use client";

import { VendorIcon } from "@/components/elements/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePricingQuery } from "@/hooks/pricing-hook";
import type { ModelType, processModels } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { getVendorTheme } from "@/lib/vendor-themes";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuSearch } from "react-icons/lu";

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  // For tiny prices, show up to 4 decimals trimmed
  const str = price.toFixed(4);
  return `$${str.replace(/0+$/, "")}`;
}

export function ModelsGrid() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ModelType | "all">("all");

  const { data } = usePricingQuery();
  const models = data?.models ?? [];

  const filterOptions: { key: ModelType | "all"; label: string }[] = [
    { key: "all", label: t("MODELS.FILTER_ALL") },
    { key: "text", label: t("MODELS.FILTER_TEXT") },
    { key: "image", label: t("MODELS.FILTER_IMAGE") },
    { key: "video", label: t("MODELS.FILTER_VIDEO") },
    { key: "audio", label: t("MODELS.FILTER_AUDIO") },
    { key: "embedding", label: t("MODELS.FILTER_EMBEDDING") },
  ];

  const filtered = models.filter((model) => {
    const matchesSearch = model.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter = filter === "all" || model.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {/* Search and Filter */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <LuSearch className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("MODELS.SEARCH_PLACEHOLDER")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {filterOptions.map((option) => (
            <Button
              key={option.key}
              variant={filter === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(option.key)}
              className="font-mono text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-muted-foreground mb-6 font-mono text-sm">
        {filtered.length} {t("MODELS.MODEL_COUNT")}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          {t("MODELS.EMPTY")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((model) => (
            <ModelCard
              key={model.name}
              model={model}
              labels={{
                perRequest: t("MODELS.PRICE_PER_REQUEST"),
                input: t("MODELS.PRICE_INPUT"),
                output: t("MODELS.PRICE_OUTPUT"),
                perMillion: t("MODELS.PRICE_PER_MILLION"),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelCard(props: {
  model: ReturnType<typeof processModels>[number];
  labels: {
    perRequest: string;
    input: string;
    output: string;
    perMillion: string;
  };
}) {
  const model = props.model;
  const theme = getVendorTheme(model.vendor.name);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-5 transition-all",
        theme.bg,
        theme.border,
        "hover:border-opacity-50",
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <VendorIcon vendor={model.vendor.name} size={20} />
          <div>
            <h3 className="font-mono text-sm font-medium tracking-wide">
              {model.name}
            </h3>
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              {model.vendor.name}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "font-mono text-[10px] uppercase",
            model.type === "text" && `${theme.tagBg} ${theme.text}`,
            model.type === "image" && "border-green-500/30 bg-green-500/10 text-green-400",
            model.type === "video" && "border-purple-500/30 bg-purple-500/10 text-purple-400",
            model.type === "audio" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
            model.type === "embedding" && "border-sky-500/30 bg-sky-500/10 text-sky-400",
          )}
        >
          {model.type}
        </Badge>
      </div>

      <div className="mt-auto pt-3">
        {model.isFixedPrice ? (
          <div className="flex items-baseline gap-1">
            <span className={cn("font-mono text-sm font-semibold", theme.text)}>
              {formatPrice(model.fixedPrice)}
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {props.labels.perRequest}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                {props.labels.input}{" "}
              </span>
              <span className={cn("font-mono text-sm font-semibold", theme.text)}>
                {formatPrice(model.inputPrice)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                {props.labels.output}{" "}
              </span>
              <span className={cn("font-mono text-sm font-semibold", theme.text)}>
                {formatPrice(model.outputPrice)}
              </span>
            </div>
            <span className="text-muted-foreground font-mono text-[10px]">
              {props.labels.perMillion}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
