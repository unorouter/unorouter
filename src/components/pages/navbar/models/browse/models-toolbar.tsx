"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useModelsFilter } from "@/hooks/ui/use-models-hook";
import { useTranslations } from "next-intl";
import { SortFilter } from "../filters/sort-filter";
import { ViewModeToggle } from "../filters/view-mode-toggle";

// Rendered twice (toolbar above lg, standalone below) so the two cannot drift.
export function SearchBox(props: { className: string }) {
  const t = useTranslations();
  const m = useModelsFilter();
  return (
    <div className={props.className}>
      <Icon
        name="search"
        className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
      />
      <Input
        placeholder={t("MODELS.SEARCH_PLACEHOLDER")}
        value={m.search}
        onChange={(e) => m.setSearch(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

export function ModelsToolbar(props: {
  showReset: boolean;
  activeFilterCount: number;
  onReset: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <h1 className="mr-2 basis-full text-lg font-semibold tracking-tight @5xl:basis-auto">
        {t("MODELS.TITLE")}
      </h1>
      <p className="text-muted-foreground sr-only">{t("MODELS.SUBTITLE")}</p>
      <div className="ml-auto flex flex-1 items-center justify-end gap-2">
        {props.showReset && (
          <Button
            variant="default"
            size="sm"
            onClick={props.onReset}
            className="h-9 px-2 lg:px-3"
          >
            <Icon name="filter-x" className="h-4 w-4 lg:mr-1.5" />
            <span className="hidden lg:inline">{t("MODELS.FILTER.RESET")}</span>
            {props.activeFilterCount > 0 && (
              <span className="bg-background/25 ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold">
                {props.activeFilterCount}
              </span>
            )}
          </Button>
        )}
        <SearchBox className="relative hidden w-full max-w-xs lg:block" />
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/compare" />}
          className="h-9 px-2 lg:px-3"
          aria-label={t("MODELS.COMPARE.BADGE")}
        >
          <Icon name="chart-column" className="h-4 w-4 lg:mr-1.5" />
          <span className="hidden lg:inline">{t("MODELS.COMPARE.BADGE")}</span>
        </Button>
        <SortFilter />
        <ViewModeToggle />
      </div>
    </div>
  );
}
