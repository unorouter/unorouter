"use client";

import { Icon } from "@/components/ui/icon";
import { buildFAQPageSchema } from "@/lib/seo/structured-data";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { TESTER_LINKS } from "../shared/links";
import type { ReactNode } from "react";
import type { TranslationKey } from "@/lib/types";

const CORS_DOCS_URL = "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS";

function inlineLink(href: string) {
  return (chunks: ReactNode) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="decoration-muted-foreground/40 hover:decoration-foreground underline underline-offset-4 transition-colors"
    >
      {chunks}
    </a>
  );
}

function answerTags() {
  return {
    gh: inlineLink(TESTER_LINKS.source),
    ghIssue: inlineLink(TESTER_LINKS.issuesNew),
    discord: inlineLink(TESTER_LINKS.discord),
    cors: inlineLink(CORS_DOCS_URL),
  };
}

const ITEMS: { q: TranslationKey; a: TranslationKey }[] = [
  {
    q: "MODEL_TESTER.FAQ.ITEMS.KEY_SAFE.Q",
    a: "MODEL_TESTER.FAQ.ITEMS.KEY_SAFE.A",
  },
  {
    q: "MODEL_TESTER.FAQ.ITEMS.SERVER_PROXY.Q",
    a: "MODEL_TESTER.FAQ.ITEMS.SERVER_PROXY.A",
  },
  {
    q: "MODEL_TESTER.FAQ.ITEMS.RELIABILITY.Q",
    a: "MODEL_TESTER.FAQ.ITEMS.RELIABILITY.A",
  },
  {
    q: "MODEL_TESTER.FAQ.ITEMS.FALSE_POSITIVE.Q",
    a: "MODEL_TESTER.FAQ.ITEMS.FALSE_POSITIVE.A",
  },
  {
    q: "MODEL_TESTER.FAQ.ITEMS.PROTOCOLS.Q",
    a: "MODEL_TESTER.FAQ.ITEMS.PROTOCOLS.A",
  },
  {
    q: "MODEL_TESTER.FAQ.ITEMS.OPEN_SOURCE.Q",
    a: "MODEL_TESTER.FAQ.ITEMS.OPEN_SOURCE.A",
  },
];

export function TesterFaq() {
  const t = useTranslations();
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
    );

  const plain = (key: TranslationKey) => {
    const out = t.rich(key, {
      gh: (c) => c,
      ghIssue: (c) => c,
      discord: (c) => c,
      cors: (c) => c,
    });
    return Array.isArray(out) ? out.join("") : String(out);
  };
  const schema = buildFAQPageSchema(
    ITEMS.map((item) => ({ question: t(item.q), answer: plain(item.a) })),
  );

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        suppressHydrationWarning
      />
      <header className="flex items-center gap-2 border-b px-5 py-4">
        <Icon name="circle-help" className="text-primary size-4" />
        <span className="text-base font-semibold">
          {t("MODEL_TESTER.FAQ.TITLE")}
        </span>
      </header>

      <div className="divide-border divide-y">
        {ITEMS.map((item, i) => {
          const isOpen = open.includes(i);
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="hover:bg-muted/40 flex w-full items-center gap-2 px-5 py-4 text-left transition-colors"
              >
                <span className="text-foreground flex-1 text-sm font-medium">
                  {t(item.q)}
                </span>
                <Icon
                  name="chevron-down"
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {isOpen ? (
                <p className="text-muted-foreground px-5 pt-0 pb-4 text-sm leading-relaxed">
                  {t.rich(item.a, answerTags())}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
