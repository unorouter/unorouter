"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { TranslationKey } from "@/lib/config/constants";
import { convIdAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type RpEntityPageProps = {
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  newLabelKey: TranslationKey;
  backLabelKey: TranslationKey;
  isEditing: boolean;
  onNew: () => void;
  onBack: () => void;
  editor: ReactNode;
  list: ReactNode;
  headerActions?: ReactNode;
  // Owned by the page so it can filter its own rows; rendered here so every
  // entity list gets the same box in the same place.
  search?: string;
  onSearchChange?: (value: string) => void;
};

export function RpEntityPage(props: RpEntityPageProps) {
  const t = useTranslations();
  const convId = useAtomValue(convIdAtom);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="text-muted-foreground -ml-2 self-start"
          render={
            <Link
              href={
                convId
                  ? { pathname: "/chat/[convId]", params: { convId } }
                  : "/chat"
              }
            />
          }
        >
          <Icon name="arrow-left" className="mr-2 size-4" />
          {t("RP.BACK_TO_CHAT")}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-foreground text-2xl font-semibold">
              {t(props.titleKey)}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t(props.subtitleKey)}
            </p>
          </div>
          {props.isEditing ? (
            <Button variant="ghost" onClick={props.onBack}>
              <Icon name="arrow-left" className="mr-2 size-4" />
              {t(props.backLabelKey)}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {props.headerActions}
              <Button onClick={props.onNew}>
                <Icon name="plus" className="mr-2 size-4" />
                {t(props.newLabelKey)}
              </Button>
            </div>
          )}
        </div>

        {!props.isEditing && props.onSearchChange && (
          <Input
            value={props.search ?? ""}
            onChange={(e) => props.onSearchChange!(e.target.value)}
            placeholder={t("RP.LIST_SEARCH")}
            aria-label={t("RP.LIST_SEARCH")}
          />
        )}

        {props.isEditing ? (
          <Card className="shrink-0 p-4">{props.editor}</Card>
        ) : (
          props.list
        )}
      </div>
    </div>
  );
}
