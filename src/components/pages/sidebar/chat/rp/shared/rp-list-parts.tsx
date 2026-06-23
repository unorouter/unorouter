"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { analytics } from "@/lib/analytics";
import type { TranslationKey } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";

type RpAnalyticsEntity = Parameters<
  typeof analytics.rp.entityAction
>[0]["entity"];

// Shared confirm dialog for RP entity deletion; key pair varies per entity.
export async function confirmRpDelete(
  t: ReturnType<typeof useTranslations<never>>,
  titleKey: TranslationKey,
  descKey: TranslationKey,
): Promise<boolean> {
  return confirm({
    title: t(titleKey),
    description: t(descKey),
    confirmLabel: t("COMMON.DELETE"),
    cancelLabel: t("COMMON.CANCEL"),
    destructive: true,
  });
}

export function RpEmptyCard(props: { labelKey: TranslationKey }) {
  const t = useTranslations();
  return (
    <Card className="text-muted-foreground py-10 text-center text-sm">
      {t(props.labelKey)}
    </Card>
  );
}

// One list row: Card shell + optional leading slot + name/description + custom actions + trailing delete. Click elsewhere opens the entity.
export function RpEntityRow(props: {
  onOpen: () => void;
  name: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  /** Extra row actions (export menu, apply button, ...). */
  actions?: ReactNode;
  onDelete: () => void | Promise<void>;
}) {
  return (
    <Card
      className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
      onClick={props.onOpen}
    >
      {props.leading}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{props.name}</span>
        {props.description != null && props.description !== "" && (
          <span className="text-muted-foreground truncate text-xs">
            {props.description}
          </span>
        )}
      </div>
      {props.actions}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          void props.onDelete();
        }}
      >
        <Icon name="trash-2" className="size-4" />
      </Button>
    </Card>
  );
}

// Hidden file input + outline import button (the toolbar trio's left half).
// When onUrl is provided, also renders a "import from link" popover (characters
// use this for JanitorAI/JannyAI links).
export function RpImportControl(props: {
  entity: RpAnalyticsEntity;
  accept: string;
  labelKey: TranslationKey;
  isPending: boolean;
  onFile: (file: File) => Promise<void>;
  onUrl?: (input: string) => Promise<void>;
  urlLabelKey?: TranslationKey;
  urlPlaceholderKey?: TranslationKey;
}) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={props.accept}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          try {
            await props.onFile(file);
            analytics.rp.entityAction({
              entity: props.entity,
              action: "imported",
            });
          } catch {
            analytics.rp.entityAction({
              entity: props.entity,
              action: "import_failed",
            });
          }
        }}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => {
          analytics.rp.entityAction({
            entity: props.entity,
            action: "import_picker_opened",
          });
          fileInputRef.current?.click();
        }}
        disabled={props.isPending}
        className="min-w-0 flex-1 sm:flex-initial"
      >
        <Icon name="upload" className="size-4" />
        <span className="truncate">{t(props.labelKey)}</span>
      </Button>
      {props.onUrl && (
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                disabled={props.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              />
            }
          >
            <Icon name="link" className="size-4" />
            <span className="truncate">
              {t(props.urlLabelKey ?? props.labelKey)}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="gap-2">
            <Input
              value={url}
              placeholder={
                props.urlPlaceholderKey ? t(props.urlPlaceholderKey) : undefined
              }
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              disabled={props.isPending || url.trim() === ""}
              onClick={async () => {
                analytics.rp.entityAction({
                  entity: props.entity,
                  action: "import_picker_opened",
                });
                try {
                  await props.onUrl!(url.trim());
                  setUrl("");
                  setLinkOpen(false);
                  analytics.rp.entityAction({
                    entity: props.entity,
                    action: "imported",
                  });
                } catch {
                  analytics.rp.entityAction({
                    entity: props.entity,
                    action: "import_failed",
                  });
                }
              }}
            >
              {t("RP.CHARACTERS_IMPORT_FROM_LINK")}
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

// Row export dropdown (download trigger + one item per format).
export function RpExportMenu(props: {
  ariaLabel: string;
  items: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={props.ariaLabel}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Icon name="download" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {props.items.map((item) => (
          <DropdownMenuItem key={item.label} onClick={item.onClick}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
