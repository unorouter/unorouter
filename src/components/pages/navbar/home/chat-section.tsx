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
            <div className="absolute -inset-px -z-10 rounded-lg bg-linear-to-r from-purple-500/20 via-transparent to-pink-500/20 opacity-50 blur-xl" />
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
                color="pink"
              />
              <FeatureCard
                icon="lock"
                title={t("HOME.CHAT.CARD3.TITLE")}
                description={t("HOME.CHAT.CARD3.DESC")}
                color="purple"
              />
              <FeatureCard
                icon="drama"
                title={t("HOME.CHAT.CARD4.TITLE")}
                description={t("HOME.CHAT.CARD4.DESC")}
                color="pink"
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
  return (
    <div className="bg-card border-border w-full overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b border-purple-500/20 bg-purple-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-linear-to-br from-purple-400 to-pink-500" />
          <span className="font-mono text-[11px] tracking-wider text-purple-700 dark:text-purple-400">
            {props.character}
          </span>
        </div>
        <div className="border-border bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-sm border px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="font-mono text-[9px] tracking-wider uppercase">
            {props.model}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <ChatBubble text={props.msgAi} side="left" />
        <ChatBubble text={props.msgUser} side="right" />
        <div className="flex items-center gap-2 pl-1">
          <div className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full" />
          <div className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
          <div className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
          <span className="text-muted-foreground ml-1 font-mono text-[9px] tracking-wider">
            {props.typing}
          </span>
        </div>
      </div>
      <div className="border-border/50 flex items-center gap-2 border-t px-4 py-3">
        <div className="border-border bg-muted text-muted-foreground flex-1 rounded-sm border px-3 py-2 font-mono text-[10px]">
          {props.input}
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-linear-to-br from-purple-500 to-pink-500">
          <Icon name="arrow-up" className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  );
}

function ChatBubble(props: { text: string; side: "left" | "right" }) {
  if (props.side === "right") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary/10 border-border max-w-[80%] rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed">
          {props.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="bg-accent border-border text-foreground max-w-[85%] rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed">
        {props.text}
      </div>
    </div>
  );
}

function FeatureCard(props: {
  icon: string;
  title: string;
  description: string;
  color: "purple" | "pink";
}) {
  const bgColor =
    props.color === "purple" ? "bg-purple-500/20" : "bg-pink-500/20";
  const iconColor =
    props.color === "purple"
      ? "text-purple-700 dark:text-purple-400"
      : "text-pink-700 dark:text-pink-400";

  return (
    <div className="border-border bg-accent rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center`}
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
