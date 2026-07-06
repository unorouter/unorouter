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
import { Link } from "@/i18n/navigation";
import type { ProcessedModel } from "@/lib/api/pricing";
import { copyToClipboard, modelHref } from "@/lib/utils/base";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";

export function ModelRowActions(props: { model: ProcessedModel }) {
  const t = useTranslations();
  const setChatModel = useSetAtom(chatModelAtom);
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
            render={<Link href={modelHref(model.name, model.vendor.name)} />}
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
              setChatModel(model.name);
            }}
            render={<Link href="/chat" />}
          >
            <Icon
              name="message-circle"
              className="text-muted-foreground mr-2 h-3.5 w-3.5"
            />
            {t("MODELS.OPEN_IN_CHAT")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              void copyToClipboard(model.name);
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
