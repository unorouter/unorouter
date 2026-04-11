import { GetStartedLink } from "@/components/elements/brand/get-started-link";
import { Link } from "@/i18n/navigation";
import {
  LuCpu,
  LuLayers,
  LuRefreshCw,
  LuServer,
  LuShield,
} from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function ReliabilitySection() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative border-t py-16 lg:py-32">
      <div className="mx-auto max-w-360 px-6">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6 lg:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-sm border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
              <LuRefreshCw className="h-3 w-3 text-cyan-700 dark:text-cyan-400" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-400">
                {t("HOME.RELIABILITY.BADGE")}
              </span>
            </div>
            <h2 className="text-4xl font-bold tracking-tighter md:text-5xl">
              {t("HOME.RELIABILITY.TITLE_1")}
              <br />
              <span className="text-cyan-600 dark:text-cyan-400">
                {t("HOME.RELIABILITY.TITLE_2")}
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg font-mono text-sm leading-relaxed">
              {t("HOME.RELIABILITY.DESCRIPTION")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={
                  <LuLayers className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
                }
                title={t("HOME.RELIABILITY.CARD1.TITLE")}
                description={t("HOME.RELIABILITY.CARD1.DESC")}
                color="cyan"
              />
              <InfoCard
                icon={
                  <LuServer className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" />
                }
                title={t("HOME.RELIABILITY.CARD2.TITLE")}
                description={t("HOME.RELIABILITY.CARD2.DESC")}
                color="purple"
              />
            </div>

            <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row">
              <GetStartedLink
                className="flex h-11 items-center gap-2 bg-linear-to-r from-cyan-500 to-cyan-600 px-6 font-mono text-xs font-bold tracking-widest text-black uppercase transition-all hover:from-cyan-400 hover:to-cyan-500"
                icon={<LuShield className="h-3.5 w-3.5" />}
              />
              <Link
                href="/docs"
                className="border-border text-foreground hover:border-foreground flex h-11 items-center gap-2 border bg-transparent px-6 font-mono text-xs font-bold tracking-widest uppercase transition-all"
              >
                {t("HOME.RELIABILITY.LEARN_MORE")}
              </Link>
            </div>
          </div>

          {/* Architecture panel */}
          <div className="relative">
            <div className="bg-card border-border w-full overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                <span className="font-mono text-[10px] tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                  {t("HOME.RELIABILITY.ARCH.TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
                  <span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-400">
                    {t("HOME.RELIABILITY.ARCH.ACTIVE")}
                  </span>
                </div>
              </div>
              <div className="space-y-4 p-6 font-mono text-xs">
                <ArchStep
                  step="1"
                  title={t("HOME.RELIABILITY.ARCH.STEP1.TITLE")}
                  description={t("HOME.RELIABILITY.ARCH.STEP1.DESC")}
                />
                <ArchStep
                  step="2"
                  title={t("HOME.RELIABILITY.ARCH.STEP2.TITLE")}
                  description={t("HOME.RELIABILITY.ARCH.STEP2.DESC")}
                />
                <ArchStep
                  step="3"
                  title={t("HOME.RELIABILITY.ARCH.STEP3.TITLE")}
                  description={t("HOME.RELIABILITY.ARCH.STEP3.DESC")}
                />
                <ArchStep
                  step="✓"
                  title={t("HOME.RELIABILITY.ARCH.STEP4.TITLE")}
                  description={t("HOME.RELIABILITY.ARCH.STEP4.DESC")}
                  success
                />
              </div>
              <div className="px-6 pb-6">
                <div className="bg-muted border-border/50 rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <LuCpu className="text-muted-foreground h-2.5 w-2.5" />
                    <span className="text-muted-foreground text-[9px] tracking-wider uppercase">
                      {t("HOME.RELIABILITY.FORMATS.TITLE")}
                    </span>
                  </div>
                  <code className="text-[10px] break-all text-cyan-700 dark:text-cyan-400">
                    {`{ "openai": "/v1/chat/completions", "anthropic": "/v1/messages", "gemini": "/v1/models" }`}
                  </code>
                  <p className="text-muted-foreground mt-2 text-[9px]">
                    {t("HOME.RELIABILITY.FORMATS.DESC")}
                  </p>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-px -z-10 rounded-lg bg-linear-to-r from-cyan-500/20 via-transparent to-purple-500/20 opacity-50 blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "cyan" | "purple";
}) {
  const bgColor =
    props.color === "cyan" ? "bg-cyan-500/20" : "bg-purple-500/20";

  return (
    <div className="border-border bg-accent rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center`}
        >
          {props.icon}
        </div>
        <span className="text-foreground font-mono text-xs tracking-wider uppercase">
          {props.title}
        </span>
      </div>
      <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
        {props.description}
      </p>
    </div>
  );
}

function ArchStep(props: {
  step: string;
  title: string;
  description: string;
  success?: boolean;
}) {
  const bgColor = props.success ? "bg-green-500/20" : "bg-cyan-500/20";
  const stepColor = props.success
    ? "text-green-700 dark:text-green-400"
    : "text-cyan-700 dark:text-cyan-400";
  const titleColor = props.success
    ? "text-green-700 dark:text-green-400"
    : "text-foreground";

  return (
    <div className="flex items-start gap-3">
      <div
        className={`h-6 w-6 rounded-full ${bgColor} flex items-center justify-center ${stepColor} mt-0.5 shrink-0 text-[10px] font-bold`}
      >
        {props.step}
      </div>
      <div>
        <div className={`${titleColor} mb-1`}>{props.title}</div>
        <div className="text-muted-foreground">{props.description}</div>
      </div>
    </div>
  );
}
