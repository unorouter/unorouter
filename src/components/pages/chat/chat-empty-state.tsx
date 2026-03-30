"use client";

import { useTranslations } from "next-intl";
import { LuMessageCircle } from "react-icons/lu";

export function ChatEmptyState() {
  const t = useTranslations();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <LuMessageCircle className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-lg font-medium">
          {t("CHAT.EMPTY_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("CHAT.EMPTY_DESCRIPTION")}
        </p>
      </div>
    </div>
  );
}
