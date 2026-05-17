import { GetStartedLink } from "@/components/elements/brand/get-started-link";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function PricingSection() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative z-10 border-t py-10 lg:py-16">
      <div className="mx-auto max-w-360 px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-sm border border-purple-500/30 bg-purple-500/10 px-3 py-1.5">
            <Icon name="zap" className="h-3 w-3 text-purple-700 dark:text-purple-400" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-purple-700 uppercase dark:text-purple-400">
              {t("HOME.HOW_IT_WORKS.LABEL")}
            </span>
          </div>
          <h2 className="text-foreground text-2xl leading-[1.1] font-bold tracking-tight md:text-4xl">
            {t("HOME.HOW_IT_WORKS.TITLE")}{" "}
            <span className="text-muted-foreground">
              {t("HOME.HOW_IT_WORKS.SUBTITLE")}
            </span>
          </h2>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <StepCard
            num={t("HOME.HOW_IT_WORKS.STEP1_NUM")}
            title={t("HOME.HOW_IT_WORKS.STEP1_TITLE")}
            desc={t("HOME.HOW_IT_WORKS.STEP1_DESC")}
            icon={<Icon name="user-plus" className="text-muted-foreground h-4 w-4" />}
          >
            <SignupDemo />
          </StepCard>

          <StepCard
            num={t("HOME.HOW_IT_WORKS.STEP2_NUM")}
            title={t("HOME.HOW_IT_WORKS.STEP2_TITLE")}
            desc={t("HOME.HOW_IT_WORKS.STEP2_DESC")}
            icon={<Icon name="wallet" className="text-muted-foreground h-4 w-4" />}
          >
            <TopUpDemo />
          </StepCard>

          <StepCard
            num={t("HOME.HOW_IT_WORKS.STEP3_NUM")}
            title={t("HOME.HOW_IT_WORKS.STEP3_TITLE")}
            desc={t("HOME.HOW_IT_WORKS.STEP3_DESC")}
            icon={<Icon name="key" className="text-muted-foreground h-4 w-4" />}
          >
            <ApiKeyDemo />
          </StepCard>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 font-mono text-xs sm:flex-row">
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

function StepCard(props: {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/40 border-border/60 flex flex-col gap-3 rounded-lg border p-4 backdrop-blur-sm transition-colors hover:border-purple-500/40 lg:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
          {props.num}
        </span>
        {props.icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-foreground text-lg font-bold tracking-tight md:text-xl">
          {props.title}
        </h3>
        <p className="text-muted-foreground font-mono text-xs leading-relaxed">
          {props.desc}
        </p>
      </div>
      <div className="border-border/40 mt-auto rounded-md border bg-black/40 p-3">
        {props.children}
      </div>
    </div>
  );
}

function SignupDemo() {
  return (
    <div className="space-y-1.5">
      <div className="bg-secondary/60 border-border/40 flex items-center gap-3 rounded border px-3 py-1.5">
        <Icon name="github" className="text-foreground/80 h-3.5 w-3.5" />
        <span className="text-foreground/80 font-mono text-[11px] tracking-wide">
          Continue with GitHub
        </span>
      </div>
      <div className="bg-secondary/60 border-border/40 flex items-center gap-3 rounded border px-3 py-1.5">
        <Icon name="brand-discord" className="text-foreground/80 h-3.5 w-3.5" />
        <span className="text-foreground/80 font-mono text-[11px] tracking-wide">
          Continue with Discord
        </span>
      </div>
      <div className="bg-secondary/60 border-border/40 flex items-center gap-3 rounded border px-3 py-1.5">
        <Icon name="mail" className="text-foreground/80 h-3.5 w-3.5" />
        <span className="text-foreground/80 font-mono text-[11px] tracking-wide">
          Continue with Email
        </span>
      </div>
    </div>
  );
}

function TopUpDemo() {
  const rows: { label: string; amount: string; widthPct: number }[] = [
    { label: "May 02", amount: "$50", widthPct: 100 },
    { label: "Apr 18", amount: "$20", widthPct: 50 },
    { label: "Apr 04", amount: "$10", widthPct: 28 },
  ];
  return (
    <div className="space-y-2.5 font-mono text-[11px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-muted-foreground w-12 shrink-0">
            {row.label}
          </span>
          <div className="bg-secondary/60 relative h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full bg-linear-to-r from-purple-500 to-purple-400"
              style={{ width: `${row.widthPct}%` }}
            />
          </div>
          <span className="text-foreground w-10 shrink-0 text-right font-bold tabular-nums">
            {row.amount}
          </span>
        </div>
      ))}
    </div>
  );
}

function ApiKeyDemo() {
  return (
    <div className="space-y-2">
      <div className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
        UNOROUTER_API_KEY
      </div>
      <div className="bg-secondary/60 border-border/40 flex items-center justify-between gap-3 rounded border px-3 py-2.5">
        <code className="text-foreground/90 truncate font-mono text-[11px] tracking-tight">
          sk-uno-{"•".repeat(24)}
        </code>
        <Icon name="copy" className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      </div>
      <div className="text-muted-foreground font-mono text-[10px]">
        Fully OpenAI compatible
      </div>
    </div>
  );
}
