import { GetStartedLink } from "@/components/elements/brand/get-started-link";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LuKey, LuUserPlus, LuWallet, LuZap } from "react-icons/lu";
import type { ComponentType } from "react";

type Step = {
  num: string;
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
};

export async function PricingSection() {
  const t = await getTranslations();

  const steps: Step[] = [
    {
      num: t("HOME.HOW_IT_WORKS.STEP1_NUM"),
      title: t("HOME.HOW_IT_WORKS.STEP1_TITLE"),
      desc: t("HOME.HOW_IT_WORKS.STEP1_DESC"),
      icon: LuUserPlus,
    },
    {
      num: t("HOME.HOW_IT_WORKS.STEP2_NUM"),
      title: t("HOME.HOW_IT_WORKS.STEP2_TITLE"),
      desc: t("HOME.HOW_IT_WORKS.STEP2_DESC"),
      icon: LuWallet,
    },
    {
      num: t("HOME.HOW_IT_WORKS.STEP3_NUM"),
      title: t("HOME.HOW_IT_WORKS.STEP3_TITLE"),
      desc: t("HOME.HOW_IT_WORKS.STEP3_DESC"),
      icon: LuKey,
    },
  ];

  return (
    <section className="border-border/50 from-background to-card relative z-10 border-t bg-linear-to-b py-16 lg:py-32">
      <div className="mx-auto max-w-360 px-6">
        <div className="mb-12 text-center lg:mb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-purple-500/30 bg-purple-500/10 px-3 py-1.5">
            <LuZap className="h-3 w-3 text-purple-700 dark:text-purple-400" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-purple-700 uppercase dark:text-purple-400">
              {t("HOME.HOW_IT_WORKS.LABEL")}
            </span>
          </div>
          <h2 className="text-foreground mb-4 text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
            {t("HOME.HOW_IT_WORKS.TITLE")}
            <br />
            <span className="text-muted-foreground">
              {t("HOME.HOW_IT_WORKS.SUBTITLE")}
            </span>
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex flex-col items-start gap-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                  {step.num}
                </span>
                <step.icon className="text-muted-foreground h-4 w-4" />
              </div>
              <h3 className="text-foreground text-xl font-bold tracking-tight md:text-2xl">
                {step.title}
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 font-mono text-xs sm:flex-row lg:mt-16">
          <GetStartedLink
            className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-11 w-full items-center justify-center gap-2 px-8 font-bold tracking-widest uppercase transition-colors sm:w-auto"
            translationKey="HOME.HOW_IT_WORKS.CTA_PRIMARY"
          />
          <Link
            href="/pricing"
            className="border-border text-foreground hover:border-foreground flex h-11 w-full items-center justify-center gap-2 border bg-transparent px-8 font-bold tracking-widest uppercase transition-all sm:w-auto"
          >
            {t("HOME.HOW_IT_WORKS.CTA_SECONDARY")}
          </Link>
        </div>
      </div>
    </section>
  );
}
