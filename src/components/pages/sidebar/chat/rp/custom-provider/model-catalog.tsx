"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { CatalogModel } from "@/lib/ai/chat/custom-provider-id";
import { isTokenizerRef } from "@/lib/ai/chat/tokenizer";
import {
  type CustomProviderForm,
  MAX_MODELS,
} from "@/lib/validation/custom-provider";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { TokenizerSelect } from "../tokenizer-select";

type FormModel = CustomProviderForm["models"][number];
type Row = { id: string; model: CatalogModel | null };

const MAX_LIST_HEIGHT = 448;

type Props = {
  form: UseFormReturn<CustomProviderForm>;
  catalog: CatalogModel[] | undefined;
  fetching: boolean;
  error: string | null;
  onFetch: () => void;
};

export function ModelCatalog(props: Props) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"enabled" | "all" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const models = props.form.watch("models");
  const enabled = new Set(models.map((m) => m.key));
  const catalog = props.catalog ?? [];
  const catalogIds = new Set(catalog.map((m) => m.id));
  const rows: Row[] = [
    ...models
      .filter((m) => m.key && !catalogIds.has(m.key))
      .map((m) => ({ id: m.key, model: null })),
    ...catalog.map((m) => ({ id: m.id, model: m })),
  ];
  const showEnabled = tab === null ? models.length > 0 : tab === "enabled";
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = rows.filter(
    (r) =>
      (!showEnabled || enabled.has(r.id)) &&
      terms.every(
        (term) =>
          r.id.toLowerCase().includes(term) ||
          (r.model?.name ?? "").toLowerCase().includes(term),
      ),
  );
  const typed = search.trim();
  const canAddTyped =
    typed !== "" && !/\s/.test(typed) && !rows.some((r) => r.id === typed);
  const shownOff = shown.filter((r) => !enabled.has(r.id));
  const shownOn = shown.length - shownOff.length;

  const virtualizer = useVirtualizer({
    count: shown.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 8,
    getItemKey: (i) => shown[i].id,
  });

  // The default tab follows the model count, so pin it before the count moves.
  const setModels = (next: FormModel[]) => {
    if (tab === null) setTab(showEnabled ? "enabled" : "all");
    props.form.setValue("models", next, { shouldDirty: true });
  };

  const enable = (current: FormModel[], add: Row[]) => {
    const room = MAX_MODELS - current.length;
    if (add.length > room)
      toast.error(
        t("CHAT.CUSTOM_PROVIDER.TOO_MANY_MODELS", { max: MAX_MODELS }),
      );
    return [
      ...current,
      ...add.slice(0, Math.max(0, room)).map((r): FormModel => ({
        key: r.id,
        label: r.model?.name ?? r.id,
        tokenizer: "auto",
        ...(r.model?.imageOnly ? { type: "image" } : {}),
      })),
    ];
  };

  const toggle = (row: Row) => {
    const current = props.form.getValues("models");
    if (current.some((m) => m.key === row.id)) {
      setModels(current.filter((m) => m.key !== row.id));
      if (expanded === row.id) setExpanded(null);
    } else {
      setModels(enable(current, [row]));
    }
  };

  const addTyped = () => {
    setModels(
      enable(props.form.getValues("models"), [{ id: typed, model: null }]),
    );
    setSearch("");
  };

  const disableShown = () => {
    const drop = new Set(shown.map((r) => r.id));
    setModels(props.form.getValues("models").filter((m) => !drop.has(m.key)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="bg-muted flex rounded-md p-0.5 text-xs">
          {(["enabled", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "text-muted-foreground rounded px-2.5 py-1",
                (key === "enabled") === showEnabled &&
                  "bg-background text-foreground font-medium shadow-sm",
              )}
            >
              {key === "enabled"
                ? t("CHAT.CUSTOM_PROVIDER.TAB_ENABLED", {
                    count: models.length,
                  })
                : t("CHAT.CUSTOM_PROVIDER.TAB_ALL", { count: rows.length })}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.fetching}
          onClick={props.onFetch}
        >
          <Icon
            name={props.fetching ? "loader" : "refresh-cw"}
            className={cn("size-4", props.fetching && "animate-spin")}
          />
          <span>{t("CHAT.CUSTOM_PROVIDER.FETCH_MODELS")}</span>
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (canAddTyped) addTyped();
        }}
        placeholder={t("CHAT.CUSTOM_PROVIDER.SEARCH_MODELS")}
        aria-label={t("CHAT.CUSTOM_PROVIDER.SEARCH_MODELS")}
      />

      {props.error && <p className="text-destructive text-xs">{props.error}</p>}

      <div className="flex flex-wrap gap-2">
        {canAddTyped && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addTyped}
          >
            <Icon name="plus" className="size-4" />
            <span className="max-w-60 truncate">
              {t("CHAT.CUSTOM_PROVIDER.ADD_TYPED", { id: typed })}
            </span>
          </Button>
        )}
        {terms.length > 0 && shownOff.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setModels(enable(props.form.getValues("models"), shownOff))
            }
          >
            {t("CHAT.CUSTOM_PROVIDER.ENABLE_SHOWN", { count: shownOff.length })}
          </Button>
        )}
        {shownOn > 0 && (terms.length > 0 || showEnabled) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={disableShown}
          >
            {t("CHAT.CUSTOM_PROVIDER.DISABLE_SHOWN", { count: shownOn })}
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground rounded-md border px-3 py-6 text-center text-xs">
          {rows.length === 0
            ? t("CHAT.CUSTOM_PROVIDER.MODELS_EMPTY")
            : showEnabled && models.length === 0
              ? t("CHAT.CUSTOM_PROVIDER.NONE_ENABLED")
              : t("CHAT.MODEL.NO_RESULTS")}
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-y-auto rounded-md border"
          style={{
            height: Math.min(virtualizer.getTotalSize(), MAX_LIST_HEIGHT),
          }}
        >
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const row = shown[item.index];
              const index = models.findIndex((m) => m.key === row.id);
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <ModelRow
                    row={row}
                    label={index >= 0 ? models[index].label : null}
                    expanded={expanded === row.id && index >= 0}
                    onToggle={() => toggle(row)}
                    onExpand={() =>
                      setExpanded(expanded === row.id ? null : row.id)
                    }
                  />
                  {expanded === row.id && index >= 0 && (
                    <ModelSettings form={props.form} index={index} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatContext(tokens: number): string {
  return tokens >= 1_000_000
    ? `${Math.round(tokens / 100_000) / 10}M`
    : `${Math.round(tokens / 1000)}k`;
}

function ModelRow(props: {
  row: Row;
  label: string | null;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const t = useTranslations();
  const model = props.row.model;
  const on = props.label !== null;
  const slash = props.row.id.indexOf("/");
  const vendor = slash > 0 ? props.row.id.slice(0, slash) : props.row.id;
  const title = props.label || model?.name || props.row.id;

  return (
    <div className="flex items-center gap-2 border-b px-2 py-1.5">
      <Checkbox
        checked={on}
        onCheckedChange={props.onToggle}
        aria-label={title}
      />
      <VendorIcon vendor={vendor} size={16} className="shrink-0" />
      <button
        type="button"
        onClick={props.onToggle}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span className="truncate text-sm">{title}</span>
        {title !== props.row.id && (
          <span className="text-muted-foreground truncate font-mono text-[11px]">
            {props.row.id}
          </span>
        )}
      </button>
      <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-[10px]">
        {model?.free && (
          <span className="rounded bg-emerald-500/15 px-1 text-emerald-600 dark:text-emerald-400">
            {t("CHAT.MODEL.FREE_BADGE")}
          </span>
        )}
        {model?.vision && (
          <span className="bg-muted rounded px-1">
            {t("CHAT.CUSTOM_PROVIDER.BADGE_VISION")}
          </span>
        )}
        {model?.imageOnly && (
          <span className="bg-muted rounded px-1">
            {t("CHAT.CUSTOM_PROVIDER.MODEL_TYPE_IMAGE")}
          </span>
        )}
        {model?.contextLength ? (
          <span className="font-mono max-sm:hidden">
            {formatContext(model.contextLength)}
          </span>
        ) : null}
      </span>
      {on && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("CHAT.CUSTOM_PROVIDER.MODEL_SETTINGS")}
          aria-expanded={props.expanded}
          onClick={props.onExpand}
        >
          <Icon name="settings-2" className="size-4" />
        </Button>
      )}
    </div>
  );
}

function ModelSettings(props: {
  form: UseFormReturn<CustomProviderForm>;
  index: number;
}) {
  const t = useTranslations();
  const base = `models.${props.index}` as const;

  return (
    <div className="bg-muted/40 flex flex-col gap-2 border-b px-3 py-2">
      <Input
        className="h-8 text-xs"
        placeholder={t("CHAT.CUSTOM_PROVIDER.MODEL_LABEL")}
        aria-label={t("CHAT.CUSTOM_PROVIDER.MODEL_LABEL")}
        {...props.form.register(`${base}.label`)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground shrink-0 text-[11px]">
          {t("CHAT.CUSTOM_PROVIDER.MODEL_TYPE")}
        </span>
        <select
          className="border-input bg-background h-7 rounded-md border px-2 text-xs"
          value={props.form.watch(`${base}.type`) ?? "text"}
          onChange={(e) =>
            props.form.setValue(
              `${base}.type`,
              e.target.value === "image" ? "image" : "text",
              { shouldDirty: true },
            )
          }
        >
          <option value="text">
            {t("CHAT.CUSTOM_PROVIDER.MODEL_TYPE_TEXT")}
          </option>
          <option value="image">
            {t("CHAT.CUSTOM_PROVIDER.MODEL_TYPE_IMAGE")}
          </option>
        </select>
        <span className="text-muted-foreground shrink-0 text-[11px]">
          {t("CHAT.CUSTOM_PROVIDER.TOKENIZER")}
        </span>
        <TokenizerSelect
          value={props.form.watch(`${base}.tokenizer`) ?? "auto"}
          onChange={(next) =>
            props.form.setValue(
              `${base}.tokenizer`,
              isTokenizerRef(next) ? next : "auto",
              { shouldDirty: true },
            )
          }
        />
      </div>
    </div>
  );
}
