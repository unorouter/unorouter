"use client";

import { VendorIcon } from "@/components/elements/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePricingQuery } from "@/hooks/pricing-hook";
import type { ModelType, ProcessedModel } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { getVendorTheme } from "@/lib/vendor-themes";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { LuSearch, LuChevronDown } from "react-icons/lu";
import { ModelDetailSheet } from "./model-detail-sheet";

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  const str = price.toFixed(4);
  return `$${str.replace(/0+$/, "")}`;
}

export function ModelsGrid() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ModelType | "all">("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [selectedModel, setSelectedModel] = useState<ProcessedModel | null>(null);

  const { data } = usePricingQuery();
  const models = data?.models ?? [];
  const endpointMap = data?.endpointMap ?? {};

  const vendorNames = useMemo(() => {
    const names = new Set(models.map((m) => m.vendor.name));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [models]);

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
    const matchesVendor = vendorFilter === "all" || model.vendor.name === vendorFilter;
    return matchesSearch && matchesFilter && matchesVendor;
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="border-input bg-background text-foreground ring-offset-background h-8 appearance-none rounded-md border px-3 pr-8 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <option value="all">{t("MODELS.FILTER_PROVIDER")}</option>
              {vendorNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <LuChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2" />
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
              onClick={() => setSelectedModel(model)}
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

      <ModelDetailSheet
        model={selectedModel}
        endpointMap={endpointMap}
        open={selectedModel !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedModel(null);
        }}
      />
    </div>
  );
}

function ModelCard(props: {
  model: ProcessedModel;
  onClick: () => void;
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
      onClick={props.onClick}
      className={cn(
        "flex cursor-pointer flex-col rounded-lg border p-5 transition-all",
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
