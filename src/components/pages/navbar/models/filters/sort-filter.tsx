"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { type SortOrder, sortOrderAtom } from "@/store/models-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";

export function SortFilter() {
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const t = useTranslations();

  const getSortLabel = () => {
    if (sortOrder === "popular") return t("MODELS.SORT.POPULAR");
    if (sortOrder === "topWeekly") return t("MODELS.SORT.TOP_WEEKLY");
    if (sortOrder === "priceAsc") return t("MODELS.SORT.PRICE_ASC");
    if (sortOrder === "priceDesc") return t("MODELS.SORT.PRICE_DESC");
    if (sortOrder === "contextDesc") return t("MODELS.SORT.CONTEXT_DESC");
    if (sortOrder === "uptimeDesc") return t("MODELS.SORT.UPTIME_DESC");
    if (sortOrder === "successDesc") return t("MODELS.SORT.SUCCESS_DESC");
    if (sortOrder === "name") return t("MODELS.SORT.NAME");
    return t("MODELS.SORT.NEWEST");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed md:h-9"
          >
            <Icon name="arrow-up-down" className="mr-1.5 h-4 w-4 md:mr-2" />
            <span>{getSortLabel()}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="whitespace-nowrap">
        <DropdownMenuRadioGroup
          value={sortOrder}
          onValueChange={(value) => setSortOrder(value as SortOrder)}
        >
          <DropdownMenuRadioItem value="popular">
            {t("MODELS.SORT.POPULAR")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="newest">
            {t("MODELS.SORT.NEWEST")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="topWeekly">
            {t("MODELS.SORT.TOP_WEEKLY")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="priceAsc">
            {t("MODELS.SORT.PRICE_ASC")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="priceDesc">
            {t("MODELS.SORT.PRICE_DESC")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="contextDesc">
            {t("MODELS.SORT.CONTEXT_DESC")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="uptimeDesc">
            {t("MODELS.SORT.UPTIME_DESC")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="successDesc">
            {t("MODELS.SORT.SUCCESS_DESC")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">
            {t("MODELS.SORT.NAME")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
