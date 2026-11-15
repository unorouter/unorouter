"use client";

import { Icon } from "@/components/ui/icon";
import { DETECTION_EXCEPTIONS, DETECTION_RULES } from "ai-model-verifier/rules";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CommunityLinks } from "./community-links";
import { TESTER_LINKS } from "../shared/links";
import { exceptionKey, ruleKey } from "../shared/rule-keys";

export function DetectionRules() {
  const t = useTranslations();
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
    );

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="flex items-center gap-2 border-b px-5 py-4">
        <Icon name="shield-check" className="text-primary size-4" />
        <span className="text-base font-semibold">
          {t("MODEL_TESTER.RULES.SECTION_TITLE")}
        </span>
      </header>

      <div className="divide-border divide-y">
        {DETECTION_RULES.map((ruleId, i) => {
          const isOpen = open.includes(i);
          return (
            <div key={ruleId}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="hover:bg-muted/40 flex w-full items-center gap-2 px-5 py-4 text-left transition-colors"
              >
                <span className="text-foreground flex-1 text-sm font-medium">
                  {t(ruleKey(ruleId, "TITLE"))}
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
                <div className="text-muted-foreground flex flex-col gap-2 px-5 pt-0 pb-4 text-sm">
                  <p>{t(ruleKey(ruleId, "MEANS"))}</p>
                  <p>
                    <span className="text-foreground/80 font-medium">
                      {t("MODEL_TESTER.RULES.WHY_LABEL")}{" "}
                    </span>
                    {t(ruleKey(ruleId, "WHY"))}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    <span className="font-medium">
                      {t("MODEL_TESTER.RULES.NOT_FLAGGED_LABEL")}{" "}
                    </span>
                    {t(ruleKey(ruleId, "EXCEPTION"))}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t px-5 py-4">
        <span className="text-foreground text-sm font-semibold">
          {t("MODEL_TESTER.RULES.NOT_FRAUD_TITLE")}
        </span>
        <ul className="flex flex-col gap-2">
          {DETECTION_EXCEPTIONS.map((id) => (
            <li key={id} className="flex gap-2 text-sm">
              <Icon
                name="circle-check"
                className="mt-0.5 size-4 shrink-0 text-emerald-500"
              />
              <span>
                <span className="text-foreground font-medium">
                  {t(exceptionKey(id, "TITLE"))}
                </span>{" "}
                <span className="text-muted-foreground">
                  {t(exceptionKey(id, "BODY"))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-muted-foreground flex flex-col gap-2 border-t px-5 py-4 text-sm">
        <p>
          {t("MODEL_TESTER.RULES.PROOF")}{" "}
          <a
            href={TESTER_LINKS.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            <Icon name="brand-github" className="size-3.5" />
            {t("MODEL_TESTER.RULES.SOURCE_LINK")}
          </a>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t("MODEL_TESTER.RULES.COMMUNITY")}</span>
          <CommunityLinks />
        </p>
      </div>
    </section>
  );
}
