"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { TranslationKey } from "@/lib/config/constants";
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
};

export function RpEntityPage(props: RpEntityPageProps) {
  const t = useTranslations();
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
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
            <Button onClick={props.onNew}>
              <Icon name="plus" className="mr-2 size-4" />
              {t(props.newLabelKey)}
            </Button>
          )}
        </div>

        {props.isEditing ? (
          <Card className="shrink-0 p-4">{props.editor}</Card>
        ) : (
          props.list
        )}
      </div>
    </div>
  );
}
