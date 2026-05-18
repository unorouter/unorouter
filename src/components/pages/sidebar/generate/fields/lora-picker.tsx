"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useLoraCatalogQuery } from "@/hooks/generation-hook";
import type { ModelFamily } from "@/lib/api/generation-models";
import { useTranslations } from "next-intl";

export type LoraEntry = {
  name: string;
  weight: number;
  source?: string;
};

type Props = {
  family: ModelFamily;
  value: LoraEntry[];
  onChange: (next: LoraEntry[]) => void;
};

function familyToBaseModel(family: ModelFamily) {
  if (family === "sdxl") return "sdxl";
  if (family === "flux2") return "flux2";
  return undefined;
}

export function LoraPicker(props: Props) {
  const t = useTranslations();
  const baseModel = familyToBaseModel(props.family);
  const catalog = useLoraCatalogQuery({ baseModel });
  const items = catalog.data?.items ?? [];

  const value = props.value;
  const selectedNames = new Set(value.map((l) => l.name));
  const available = items.filter((it) => !selectedNames.has(it.filename));

  const onAdd = (filename: string, defaultWeight: number, source: string) => {
    props.onChange([
      ...value,
      { name: filename, weight: defaultWeight, source },
    ]);
  };
  const onRemove = (idx: number) => {
    props.onChange(value.filter((_, j) => j !== idx));
  };
  const onWeightChange = (idx: number, weight: number) => {
    const next = [...value];
    next[idx] = { ...next[idx], weight };
    props.onChange(next);
  };

  return (
    <FormItem>
      <FormLabel>{t("IMAGE.LORAS_TITLE")}</FormLabel>

      <div className="flex flex-col gap-3">
        {value.map((lora, i) => (
          <div
            key={`${lora.name}-${i}`}
            className="bg-muted/50 flex items-center gap-3 rounded-md p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{lora.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <Slider
                  className="flex-1"
                  min={0}
                  max={2}
                  step={0.05}
                  value={[lora.weight]}
                  onValueChange={(v) =>
                    onWeightChange(i, Array.isArray(v) ? v[0] : v)
                  }
                />
                <Input
                  className="w-20"
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  value={lora.weight}
                  onChange={(e) =>
                    onWeightChange(i, Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onRemove(i)}
              title={t("IMAGE.DELETE")}
            >
              <Icon name="x" />
            </Button>
          </div>
        ))}

        <Popover>
          <PopoverTrigger className="bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium">
            <Icon name="plus" className="mr-2" />
            {t("IMAGE.LORAS_TITLE")}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            {catalog.isLoading && (
              <div className="text-muted-foreground p-4 text-sm">
                {t("IMAGE.STATUS_PENDING")}
              </div>
            )}
            {!catalog.isLoading && items.length === 0 && (
              <div className="text-muted-foreground p-4 text-sm">
                {t("IMAGE.LORAS_EMPTY")}
              </div>
            )}
            {!catalog.isLoading &&
              items.length > 0 &&
              available.length === 0 && (
                <div className="text-muted-foreground p-4 text-sm">
                  {t("IMAGE.HISTORY_EMPTY")}
                </div>
              )}
            {available.length > 0 && (
              <div className="flex max-h-72 flex-col overflow-y-auto py-2">
                {available.map((lora) => (
                  <button
                    key={lora.id}
                    type="button"
                    className="hover:bg-muted flex flex-col items-start gap-0.5 px-3 py-2 text-left"
                    onClick={() =>
                      onAdd(
                        lora.filename,
                        lora.defaultWeight,
                        `${lora.source}:${lora.sourceId}`,
                      )
                    }
                  >
                    <div className="text-sm font-medium">{lora.name}</div>
                    {lora.description && (
                      <div className="text-muted-foreground line-clamp-2 text-xs">
                        {lora.description}
                      </div>
                    )}
                    <div className="text-muted-foreground mt-0.5 flex gap-2 text-[10px] tracking-wide uppercase">
                      <span>{lora.category}</span>
                      <span>{lora.baseModel}</span>
                      {lora.nsfw && <span className="text-pink-500">nsfw</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </FormItem>
  );
}
