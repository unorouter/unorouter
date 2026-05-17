"use client";

import { LocalDbStudio } from "@/components/elements/local-db-studio";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuDatabase, LuEllipsisVertical } from "react-icons/lu";

export function GenerateActionsMenu() {
  const t = useTranslations();
  const [dbStudioOpen, setDbStudioOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("CHAT.MORE.OPEN")}
              title={t("CHAT.MORE.OPEN")}
            />
          }
        >
          <LuEllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setDbStudioOpen(true)}>
            <LuDatabase className="size-4" />
            {t("CHAT.MORE.LOCAL_DB")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LocalDbStudio open={dbStudioOpen} onOpenChange={setDbStudioOpen} />
    </>
  );
}
