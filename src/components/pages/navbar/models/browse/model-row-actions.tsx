"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { useModelWatch } from "@/hooks/models/notify-hook";
import { Link } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import type { PricingCatalogModel } from "@/openapi";
import { copyToClipboard, modelHref } from "@/lib/utils/base";
import { cn } from "@/lib/utils";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";

export function ModelRowActions(props: { model: PricingCatalogModel }) {
  const t = useTranslations();
  const setChatModel = useSetAtom(chatModelAtom);
  const watch = useModelWatch(props.model.model_name);
  const model = props.model;

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("MODELS.ACTIONS.OPEN_MENU")}
              className="data-popup-open:bg-muted h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <Icon name="dots-horizontal" className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => e.stopPropagation()}
            render={<Link href={modelHref(model.model_name, model.vendor)} />}
          >
            <Icon
              name="external-link"
              className="text-muted-foreground mr-2 h-3.5 w-3.5"
            />
            {t("MODELS.VIEW_DETAILS")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              analytics.models.openInChat({ model: model.model_name });
              setChatModel(model.model_name);
            }}
            render={<Link href="/chat" />}
          >
            <Icon
              name="message-circle"
              className="text-muted-foreground mr-2 h-3.5 w-3.5"
            />
            {t("MODELS.OPEN_IN_CHAT")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              watch.toggle();
            }}
          >
            <Icon
              name="bell"
              className={cn(
                "mr-2 h-3.5 w-3.5",
                watch.watched ? "text-primary" : "text-muted-foreground",
              )}
            />
            {watch.watched ? t("NOTIFY.UNWATCH") : t("NOTIFY.WATCH")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              analytics.content.copied({ label: "model_name" });
              void copyToClipboard(model.model_name);
            }}
          >
            <Icon
              name="clipboard-copy"
              className="text-muted-foreground mr-2 h-3.5 w-3.5"
            />
            {t("MODELS.ACTIONS.COPY_NAME")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
