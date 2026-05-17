"use client";

// Header trigger for the LocalDbStudio sheet. Requires a double-click to
// open so accidental taps on mobile don't pop a heavyweight database
// browser. First click arms a 400ms window; second click within that
// window opens the sheet.

import { LocalDbStudio } from "@/components/elements/local-db-studio";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { LuDatabase } from "react-icons/lu";
import { toast } from "sonner";

export function LocalDbButton() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const clickRef = useRef<number>(0);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("CHAT.MORE.LOCAL_DB")}
        title={t("CHAT.MORE.LOCAL_DB_DOUBLE_CLICK")}
        onClick={() => {
          const now = Date.now();
          if (now - clickRef.current < 400) {
            clickRef.current = 0;
            setOpen(true);
          } else {
            clickRef.current = now;
            toast.message(t("CHAT.MORE.LOCAL_DB_DOUBLE_CLICK"));
          }
        }}
      >
        <LuDatabase className="size-4" />
      </Button>
      <LocalDbStudio open={open} onOpenChange={setOpen} />
    </>
  );
}
