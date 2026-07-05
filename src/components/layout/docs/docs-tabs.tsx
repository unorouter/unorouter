"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/** ePhone-style top tab bar for the docs area: Integrations | Chat. */
export function DocsTabs() {
  const t = useTranslations();
  const pathname = usePathname();
  const chatActive = pathname.startsWith("/docs/chat");

  const tabClass = (active: boolean) =>
    cn(
      "border-b-2 px-1 pb-2 pt-3 text-sm font-medium transition-colors",
      active
        ? "border-primary text-foreground"
        : "text-muted-foreground hover:text-foreground border-transparent",
    );

  return (
    <div className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-12 z-10 border-b backdrop-blur">
      <nav className="flex gap-6 px-4 md:px-6">
        <Link href="/docs" className={tabClass(!chatActive)}>
          {t("DOCS_CHAT.COMMON.TAB_INTEGRATIONS")}
        </Link>
        <Link href="/docs/chat" className={tabClass(chatActive)}>
          {t("DOCS_CHAT.COMMON.TAB_CHAT")}
        </Link>
      </nav>
    </div>
  );
}
