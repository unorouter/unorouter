"use client";

import { usePathname } from "@/i18n/navigation";
import { PrefetchLink } from "@/components/layout/nav/prefetch-link";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function DocsTabs() {
  const t = useTranslations();
  const pathname = usePathname();
  const platformActive = pathname.startsWith("/docs/platform");
  const chatActive = pathname.startsWith("/docs/chat");
  const integrationsActive = pathname.startsWith("/docs/integrations");

  const tabClass = (active: boolean) =>
    cn(
      "border-b-2 px-1 pb-1.5 pt-2 text-xs font-medium transition-colors",
      active
        ? "border-primary text-foreground"
        : "text-muted-foreground hover:text-foreground border-transparent",
    );

  // Must stay opaque and above the sidebar's z-10, else its links ghost through.
  return (
    <div className="border-border bg-background sticky top-12 z-20 border-b">
      <nav className="flex gap-4 px-4 md:px-6">
        <PrefetchLink
          href="/docs/platform"
          className={tabClass(platformActive)}
        >
          {t("DOCS_PLATFORM.COMMON.TAB_PLATFORM")}
        </PrefetchLink>
        <PrefetchLink
          href="/docs/integrations"
          className={tabClass(integrationsActive)}
        >
          {t("DOCS_CHAT.COMMON.TAB_INTEGRATIONS")}
        </PrefetchLink>
        <PrefetchLink href="/docs/chat" className={tabClass(chatActive)}>
          {t("DOCS_CHAT.COMMON.TAB_CHAT")}
        </PrefetchLink>
      </nav>
    </div>
  );
}
