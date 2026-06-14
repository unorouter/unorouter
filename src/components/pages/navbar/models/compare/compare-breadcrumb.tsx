"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// Home / Compare / <combo>. No shared breadcrumb primitive exists in uno, so
// this is a small inline one (ASCII "/" separators per repo punctuation rules).
export function CompareBreadcrumb(props: { combo?: string }) {
  const t = useTranslations();
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground mb-4 flex items-center gap-2 font-mono text-sm"
    >
      <Link href="/" className="hover:text-foreground transition-colors">
        {t("NAV.HOME")}
      </Link>
      <span>/</span>
      {props.combo ? (
        <>
          <Link
            href="/compare"
            className="hover:text-foreground transition-colors"
          >
            {t("MODELS.COMPARE.TITLE")}
          </Link>
          <span>/</span>
          <span className="text-foreground truncate">{props.combo}</span>
        </>
      ) : (
        <span className="text-foreground">{t("MODELS.COMPARE.TITLE")}</span>
      )}
    </nav>
  );
}
