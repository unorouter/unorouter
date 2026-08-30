"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { analytics } from "@/lib/analytics";
import { dayjs, formatRelativeUnix } from "@/lib/utils/format/date";
import type { TranslationKey } from "@/lib/config/constants";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";

type RpAnalyticsEntity = Parameters<
  typeof analytics.rp.entityAction
>[0]["entity"];

export const RP_ACTION_BUTTON = "max-sm:h-8 max-sm:px-2 max-sm:text-xs";

export function RpAvatar(props: {
  mediaId: string | null | undefined;
  name: string;
  className?: string;
}) {
  const src = useMediaSrc(props.mediaId);
  return (
    <Avatar className={props.className ?? "size-10"}>
      {/* A plain img, not AvatarImage: base-ui 1.7.0 re-runs its loading-status
          effect on every render for a blob: URL and blows the update depth, which
          crashes the whole list as soon as one avatar is present. */}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image cannot optimize it
        <img
          src={src}
          alt={props.name}
          className="absolute inset-0 aspect-square size-full rounded-full object-cover"
        />
      )}
      <AvatarFallback>{props.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}

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

function toUnix(
  value: Date | string | number | null | undefined,
): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : dayjs(value).valueOf();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// Relative, and only shows "edited" when the row actually changed after it was
// created: every import writes both stamps in the same tick, so printing both
// unconditionally would put the same value on the line twice.
function RpEntityDates(props: {
  created: Date | string | number | null | undefined;
  updated: Date | string | number | null | undefined;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const created = toUnix(props.created);
  const updated = toUnix(props.updated);
  if (created === null && updated === null) return null;
  const edited = created !== null && updated !== null && updated - created > 60;
  return (
    <span className="text-muted-foreground/70 truncate text-[11px]">
      {created !== null &&
        t("RP.LIST_CREATED", { when: formatRelativeUnix(created, locale) })}
      {edited && updated !== null && (
        <>
          {created !== null && " · "}
          {t("RP.LIST_EDITED", { when: formatRelativeUnix(updated, locale) })}
        </>
      )}
    </span>
  );
}

export function RpEntityRow(props: {
  onOpen: () => void;
  name: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  createdAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
  onDuplicate?: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const t = useTranslations();
  return (
    <Card
      // shrink-0 because the list is a flex column: without it a long list
      // compresses every row to a fraction of its content height and the text
      // of one row renders over the next.
      className="hover:bg-accent flex shrink-0 cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
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
        <RpEntityDates created={props.createdAt} updated={props.updatedAt} />
      </div>
      {props.actions}
      {props.onDuplicate && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("RP.DUPLICATE")}
          onClick={(e) => {
            e.stopPropagation();
            void props.onDuplicate!();
          }}
        >
          <Icon name="copy" className="size-4" />
        </Button>
      )}
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

export function RpImportControl(props: {
  entity: RpAnalyticsEntity;
  accept?: string;
  labelKey: TranslationKey;
  isPending: boolean;
  onFile?: (file: File) => Promise<void>;
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
          if (!file || !props.onFile) return;
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
      {props.onFile && (
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
          className={RP_ACTION_BUTTON}
        >
          <Icon name="upload" className="size-4" />
          {t(props.labelKey)}
        </Button>
      )}
      {/* An import runs for as long as the worker needs, and dismissing the
          popover used to strand it: the trigger was disabled while pending, so
          the progress and the eventual error had nowhere to appear. Hold it open
          for the duration, and leave the trigger usable so a stray click outside
          can be undone. */}
      {props.onUrl && (
        <Popover
          open={linkOpen}
          onOpenChange={(open) => setLinkOpen(open || props.isPending)}
        >
          <PopoverTrigger
            render={<Button variant="outline" className={RP_ACTION_BUTTON} />}
          >
            <Icon name="link" className="size-4" />
            {t(props.urlLabelKey ?? props.labelKey)}
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
                  // Leave the URL in the box: a failure the user can retry
                  // should not make them paste the link again.
                  setLinkOpen(true);
                  analytics.rp.entityAction({
                    entity: props.entity,
                    action: "import_failed",
                  });
                }
              }}
            >
              {props.isPending && (
                <Icon name="loader" className="size-4 animate-spin" />
              )}
              {props.isPending
                ? t("RP.IMPORT_FETCHING")
                : t("RP.CHARACTERS_IMPORT_FROM_LINK")}
            </Button>
            {props.isPending && (
              <p className="text-muted-foreground text-xs">
                {t("RP.IMPORT_FETCHING_HINT")}
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

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

// Case-insensitive substring over whichever fields a list wants searchable.
// Shared so seven lists agree on what "search" means.
export function rpFilter<T>(
  rows: T[] | null | undefined,
  query: string,
  fields: (row: T) => (string | null | undefined)[],
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows ?? [];
  return (rows ?? []).filter((row) =>
    fields(row).some((v) => (v ?? "").toLowerCase().includes(q)),
  );
}
