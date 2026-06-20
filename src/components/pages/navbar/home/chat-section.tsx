import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function ChatSection() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative border-t py-16 lg:py-32">
      <div className="mx-auto max-w-360 px-6">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <ChatMock
              character={t("HOME.CHAT.MOCK.CHARACTER")}
              model={t("HOME.CHAT.MOCK.MODEL")}
              msgAi={t("HOME.CHAT.MOCK.MSG_AI")}
              msgUser={t("HOME.CHAT.MOCK.MSG_USER")}
              typing={t("HOME.CHAT.MOCK.TYPING")}
              input={t("HOME.CHAT.MOCK.INPUT")}
            />
            <div className="absolute -inset-px -z-10 rounded-xl bg-linear-to-br from-purple-500/20 via-transparent to-cyan-500/20 opacity-60 blur-2xl" />
          </div>

          <div className="order-1 space-y-6 lg:order-2 lg:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-sm border border-purple-500/30 bg-purple-500/10 px-3 py-1.5">
              <Icon
                name="message-circle"
                className="h-3 w-3 text-purple-700 dark:text-purple-400"
              />
              <span className="font-mono text-[10px] tracking-[0.2em] text-purple-700 uppercase dark:text-purple-400">
                {t("HOME.CHAT.BADGE")}
              </span>
            </div>
            <h2 className="text-4xl font-bold tracking-tighter md:text-5xl">
              {t("HOME.CHAT.TITLE_1")}
              <br />
              <span className="text-purple-600 dark:text-purple-400">
                {t("HOME.CHAT.TITLE_2")}
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg font-mono text-sm leading-relaxed">
              {t("HOME.CHAT.DESCRIPTION")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                icon="zap"
                title={t("HOME.CHAT.CARD1.TITLE")}
                description={t("HOME.CHAT.CARD1.DESC")}
                color="purple"
              />
              <FeatureCard
                icon="users"
                title={t("HOME.CHAT.CARD2.TITLE")}
                description={t("HOME.CHAT.CARD2.DESC")}
                color="cyan"
              />
              <FeatureCard
                icon="lock"
                title={t("HOME.CHAT.CARD3.TITLE")}
                description={t("HOME.CHAT.CARD3.DESC")}
                color="cyan"
              />
              <FeatureCard
                icon="drama"
                title={t("HOME.CHAT.CARD4.TITLE")}
                description={t("HOME.CHAT.CARD4.DESC")}
                color="purple"
              />
            </div>

            <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row">
              <Link
                href="/chat"
                className="flex h-11 items-center gap-2 bg-linear-to-r from-purple-500 to-purple-600 px-6 font-mono text-xs font-bold tracking-widest text-white uppercase transition-all hover:from-purple-400 hover:to-purple-500"
              >
                <Icon name="message-circle" className="h-3.5 w-3.5" />
                {t("HOME.CHAT.CTA_OPEN")}
              </Link>
              <Link
                href="/docs/sillytavern"
                className="border-border text-foreground hover:border-foreground flex h-11 items-center gap-2 border bg-transparent px-6 font-mono text-xs font-bold tracking-widest uppercase transition-all"
              >
                {t("HOME.CHAT.CTA_CONNECT")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatMock(props: {
  character: string;
  model: string;
  msgAi: string;
  msgUser: string;
  typing: string;
  input: string;
}) {
  const initial = props.character.trim().charAt(0).toUpperCase();
  return (
    <div className="bg-card border-border w-full overflow-hidden rounded-xl border shadow-2xl shadow-purple-500/5">
      <div className="border-border/60 bg-muted/40 flex items-center gap-3 border-b px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-2.5">
          <div className="relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-cyan-500 font-mono text-[11px] font-bold text-white">
              {initial}
            </div>
            <span className="border-card absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 bg-green-500" />
          </div>
          <span className="text-foreground font-sans text-sm font-semibold">
            {props.character}
          </span>
        </div>
        <div className="border-border bg-background/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-muted-foreground font-mono text-[9px] font-bold tracking-wider uppercase">
            {props.model}
          </span>
        </div>
      </div>

      <div className="space-y-4 bg-linear-to-b from-transparent to-purple-500/2 p-5">
        <ChatBubble text={props.msgAi} side="left" initial={initial} />
        <ChatBubble text={props.msgUser} side="right" />
        <div className="flex items-end gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-cyan-500 font-mono text-[10px] font-bold text-white">
            {initial}
          </div>
          <div className="bg-accent border-border/60 flex items-center gap-1.5 rounded-2xl rounded-bl-sm border px-3.5 py-2.5">
            <span className="bg-muted-foreground/70 h-1.5 w-1.5 animate-bounce rounded-full" />
            <span className="bg-muted-foreground/70 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
            <span className="bg-muted-foreground/70 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
          </div>
        </div>
      </div>

      <div className="border-border/60 flex items-center gap-2 border-t px-4 py-3">
        <div className="border-border bg-background/60 text-muted-foreground flex-1 rounded-full border px-4 py-2.5 font-sans text-xs">
          {props.input}
        </div>
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-purple-600 text-white"
        >
          <Icon name="arrow-up" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChatBubble(props: {
  text: string;
  side: "left" | "right";
  initial?: string;
}) {
  if (props.side === "right") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-linear-to-br from-purple-500 to-purple-600 px-3.5 py-2.5 font-sans text-[13px] leading-relaxed text-white shadow-sm">
          {props.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-cyan-500 font-mono text-[10px] font-bold text-white">
        {props.initial}
      </div>
      <div className="bg-accent border-border/60 text-foreground max-w-[80%] rounded-2xl rounded-bl-sm border px-3.5 py-2.5 font-sans text-[13px] leading-relaxed">
        {props.text}
      </div>
    </div>
  );
}

function FeatureCard(props: {
  icon: string;
  title: string;
  description: string;
  color: "purple" | "cyan";
}) {
  const ring =
    props.color === "purple"
      ? "hover:border-purple-500/40"
      : "hover:border-cyan-500/40";
  const bgColor =
    props.color === "purple" ? "bg-purple-500/15" : "bg-cyan-500/15";
  const iconColor =
    props.color === "purple"
      ? "text-purple-700 dark:text-purple-400"
      : "text-cyan-700 dark:text-cyan-400";

  return (
    <div
      className={`border-border bg-accent/60 rounded-lg border p-4 backdrop-blur-sm transition-colors ${ring}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}
        >
          <Icon name={props.icon} className={`h-3.5 w-3.5 ${iconColor}`} />
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
