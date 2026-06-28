"use client";

import { Icon } from "@/components/ui/icon";
import { DetectionRules } from "./detection-rules";
import { TesterFaq } from "./tester-faq";
import { TESTER_LINKS } from "./links";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/types";
import type { ReactNode } from "react";

const SUB_NAV: { href: LinkHref; labelKey: TranslationKey; icon: string }[] = [
  {
    href: "/ai-api-model-tester",
    labelKey: "MODEL_TESTER.TABS.TEST",
    icon: "shield-check",
  },
  {
    href: "/ai-api-model-tester/history",
    labelKey: "MODEL_TESTER.TABS.HISTORY",
    icon: "scroll-text",
  },
  {
    href: "/ai-api-model-tester/rankings",
    labelKey: "MODEL_TESTER.TABS.RANKINGS",
    icon: "chart-column-big",
  },
];

export function TesterShell(props: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-150 opacity-20 dark:opacity-[0.10]"
        style={{
          background: [
            "radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.16 155 / 80%) 0%, transparent 70%)",
            "radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.70 0.13 185 / 60%) 0%, transparent 70%)",
            "radial-gradient(ellipse 40% 35% at 50% 70%, oklch(0.74 0.12 140 / 40%) 0%, transparent 70%)",
          ].join(", "),
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-3 pt-16 pb-10 sm:px-6 sm:pt-20 sm:pb-12 xl:px-8">
        <header className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {t("MODEL_TESTER.HERO.EYEBROW")}
          </p>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.15] font-bold tracking-tight">
            {t("MODEL_TESTER.HERO.TITLE")}
          </h1>
          <p className="text-muted-foreground/80 max-w-2xl text-sm">
            {t("MODEL_TESTER.HERO.SUBTITLE")}
          </p>
        </header>

        <nav
          role="tablist"
          className="border-border/60 flex items-center gap-1 border-b"
        >
          {SUB_NAV.map((item) => {
            const href = item.href as string;
            // History/rankings match by prefix; tester is the bare path (and any
            // /history/[id] or /rankings/... still highlights its parent tab).
            const isTester = href === "/ai-api-model-tester";
            const active = isTester
              ? pathname.endsWith("/ai-api-model-tester")
              : pathname.includes(href.replace("/ai-api-model-tester", ""));
            return (
              <Link
                key={href}
                href={item.href}
                role="tab"
                aria-selected={active}
                className={cn(
                  "relative -mb-px flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon name={item.icon} className="size-4" />
                {t(item.labelKey)}
                <span
                  aria-hidden
                  className={cn(
                    "bg-foreground absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {props.children}

        <WhyUs />
        <DetectionRules />
        <TesterFaq />

        <div className="bg-card flex flex-col gap-3 overflow-hidden rounded-lg border px-5 py-4">
          <p className="text-foreground inline-flex items-center gap-2 text-base font-semibold">
            <Icon name="brand-github" className="text-primary size-4" />
            {t("MODEL_TESTER.TRUST.TITLE")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("MODEL_TESTER.TRUST.BODY")}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={TESTER_LINKS.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-muted-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              <Icon name="brand-github" className="size-4" />
              {t("MODEL_TESTER.TRUST.GITHUB")}
            </a>
            <a
              href={TESTER_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-muted-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              <Icon name="brand-discord" className="size-4" />
              {t("MODEL_TESTER.TRUST.DISCORD")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const WHY_CARDS: {
  icon: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}[] = [
  {
    icon: "shield-check",
    titleKey: "MODEL_TESTER.WHY.DETERMINISTIC_TITLE",
    bodyKey: "MODEL_TESTER.WHY.DETERMINISTIC_BODY",
  },
  {
    icon: "cloud-upload",
    titleKey: "MODEL_TESTER.WHY.VERIFIED_TITLE",
    bodyKey: "MODEL_TESTER.WHY.VERIFIED_BODY",
  },
  {
    icon: "scroll-text",
    titleKey: "MODEL_TESTER.WHY.EVIDENCE_TITLE",
    bodyKey: "MODEL_TESTER.WHY.EVIDENCE_BODY",
  },
];

function WhyUs() {
  const t = useTranslations();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t("MODEL_TESTER.WHY.TITLE")}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {WHY_CARDS.map((card) => (
          <div
            key={card.titleKey}
            className="bg-card flex flex-col gap-2 overflow-hidden rounded-lg border px-5 py-4"
          >
            <span className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
              <Icon name={card.icon} className="text-primary size-4" />
              {t(card.titleKey)}
            </span>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(card.bodyKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
