"use client";

import { Icon } from "@/components/ui/icon";
import { DETECTION_EXCEPTIONS, DETECTION_RULES } from "@/lib/ai/verify/rules";
import type {
  DetectionExceptionId,
  DetectionRuleId,
} from "@/lib/ai/verify/rules";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CommunityLinks } from "./community-links";
import { TESTER_LINKS } from "../shared/links";
import type { TranslationKey } from "@/lib/types";

const RULE_TITLE: Record<DetectionRuleId, TranslationKey> = {
  "coding-tool": "MODEL_TESTER.RULES.CODING-TOOL.TITLE",
  scam: "MODEL_TESTER.RULES.SCAM.TITLE",
  "cjk-leak": "MODEL_TESTER.RULES.CJK-LEAK.TITLE",
  mux: "MODEL_TESTER.RULES.MUX.TITLE",
  foreign: "MODEL_TESTER.RULES.FOREIGN.TITLE",
  "tier-mismatch": "MODEL_TESTER.RULES.TIER-MISMATCH.TITLE",
};
const RULE_MEANS: Record<DetectionRuleId, TranslationKey> = {
  "coding-tool": "MODEL_TESTER.RULES.CODING-TOOL.MEANS",
  scam: "MODEL_TESTER.RULES.SCAM.MEANS",
  "cjk-leak": "MODEL_TESTER.RULES.CJK-LEAK.MEANS",
  mux: "MODEL_TESTER.RULES.MUX.MEANS",
  foreign: "MODEL_TESTER.RULES.FOREIGN.MEANS",
  "tier-mismatch": "MODEL_TESTER.RULES.TIER-MISMATCH.MEANS",
};
const RULE_WHY: Record<DetectionRuleId, TranslationKey> = {
  "coding-tool": "MODEL_TESTER.RULES.CODING-TOOL.WHY",
  scam: "MODEL_TESTER.RULES.SCAM.WHY",
  "cjk-leak": "MODEL_TESTER.RULES.CJK-LEAK.WHY",
  mux: "MODEL_TESTER.RULES.MUX.WHY",
  foreign: "MODEL_TESTER.RULES.FOREIGN.WHY",
  "tier-mismatch": "MODEL_TESTER.RULES.TIER-MISMATCH.WHY",
};
const RULE_EXCEPTION: Record<DetectionRuleId, TranslationKey> = {
  "coding-tool": "MODEL_TESTER.RULES.CODING-TOOL.EXCEPTION",
  scam: "MODEL_TESTER.RULES.SCAM.EXCEPTION",
  "cjk-leak": "MODEL_TESTER.RULES.CJK-LEAK.EXCEPTION",
  mux: "MODEL_TESTER.RULES.MUX.EXCEPTION",
  foreign: "MODEL_TESTER.RULES.FOREIGN.EXCEPTION",
  "tier-mismatch": "MODEL_TESTER.RULES.TIER-MISMATCH.EXCEPTION",
};

const EXCEPTION_TITLE: Record<DetectionExceptionId, TranslationKey> = {
  version: "MODEL_TESTER.RULES.EXCEPTION.VERSION.TITLE",
  transient: "MODEL_TESTER.RULES.EXCEPTION.TRANSIENT.TITLE",
  "cloud-host": "MODEL_TESTER.RULES.EXCEPTION.CLOUD-HOST.TITLE",
  reshaping: "MODEL_TESTER.RULES.EXCEPTION.RESHAPING.TITLE",
  threshold: "MODEL_TESTER.RULES.EXCEPTION.THRESHOLD.TITLE",
};
const EXCEPTION_BODY: Record<DetectionExceptionId, TranslationKey> = {
  version: "MODEL_TESTER.RULES.EXCEPTION.VERSION.BODY",
  transient: "MODEL_TESTER.RULES.EXCEPTION.TRANSIENT.BODY",
  "cloud-host": "MODEL_TESTER.RULES.EXCEPTION.CLOUD-HOST.BODY",
  reshaping: "MODEL_TESTER.RULES.EXCEPTION.RESHAPING.BODY",
  threshold: "MODEL_TESTER.RULES.EXCEPTION.THRESHOLD.BODY",
};

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
                  {t(RULE_TITLE[ruleId])}
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
                  <p>{t(RULE_MEANS[ruleId])}</p>
                  <p>
                    <span className="text-foreground/80 font-medium">
                      {t("MODEL_TESTER.RULES.WHY_LABEL")}{" "}
                    </span>
                    {t(RULE_WHY[ruleId])}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    <span className="font-medium">
                      {t("MODEL_TESTER.RULES.NOT_FLAGGED_LABEL")}{" "}
                    </span>
                    {t(RULE_EXCEPTION[ruleId])}
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
                  {t(EXCEPTION_TITLE[id])}
                </span>{" "}
                <span className="text-muted-foreground">
                  {t(EXCEPTION_BODY[id])}
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
