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
            <ChatMock t={t as (key: string) => string} />
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

// Faithful miniature of the real chat app: sidebar + conv list, top bar with a
// FREE model pill, the actual RP feature menu (Characters/Personas/Lorebooks/
// Presets/Cards), a real assistant message with the token-count footer.
function ChatMock(props: { t: (key: string) => string }) {
  const t = props.t;
  const convs: { icon: string; label: string; active?: boolean }[] = [
    { icon: "drama", label: t("HOME.CHAT.MOCK.CONV1"), active: true },
    { icon: "wand", label: t("HOME.CHAT.MOCK.CONV2") },
    { icon: "message-circle", label: t("HOME.CHAT.MOCK.CONV3") },
  ];
  const menu: { icon: string; label: string; accent?: boolean }[] = [
    { icon: "users", label: t("RP.SIDEBAR_TAB_CHARACTERS"), accent: true },
    { icon: "user", label: t("RP.SIDEBAR_TAB_PERSONAS") },
    { icon: "book-text", label: t("RP.SIDEBAR_TAB_LOREBOOKS") },
    { icon: "sliders-horizontal", label: t("RP.SIDEBAR_TAB_PRESETS") },
    { icon: "layers", label: t("RP.SIDEBAR_TAB_CARDS") },
  ];

  return (
    <div className="bg-card border-border flex h-104 w-full overflow-hidden rounded-xl border font-sans shadow-2xl shadow-purple-500/5">
      {/* sidebar */}
      <div className="border-border/60 bg-muted/30 hidden w-40 shrink-0 flex-col border-r p-2.5 sm:flex">
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <div className="h-4 w-4 rounded-sm bg-linear-to-br from-purple-500 to-cyan-500" />
          <span className="text-foreground font-mono text-[10px] font-bold tracking-wider">
            {t("HOME.CHAT.MOCK.BRAND")}
          </span>
        </div>
        <div className="bg-background/60 border-border/50 text-muted-foreground mb-2 flex items-center gap-1.5 rounded border px-2 py-1.5">
          <Icon name="plus" className="h-2.5 w-2.5" />
          <span className="font-mono text-[9px] tracking-wide">
            {t("HOME.CHAT.MOCK.NEW_CHAT")}
          </span>
        </div>
        <div className="space-y-0.5">
          {convs.map((c) => (
            <div
              key={c.label}
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 ${c.active ? "bg-purple-500/15 text-foreground" : "text-muted-foreground"}`}
            >
              <Icon
                name={c.icon}
                className={`h-2.5 w-2.5 shrink-0 ${c.active ? "text-purple-600 dark:text-purple-400" : ""}`}
              />
              <span className="truncate font-mono text-[9px] tracking-tight">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* main pane */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <div className="border-border/60 flex items-center gap-2 border-b px-3 py-2.5">
          <div className="border-border bg-background/60 flex items-center gap-1.5 rounded border px-2 py-1">
            <span className="text-foreground/80 font-mono text-[9px]">
              {t("HOME.CHAT.MOCK.MODEL_NAME")}
            </span>
            <span className="rounded-sm bg-green-500/20 px-1 font-mono text-[8px] font-bold tracking-wider text-green-700 uppercase dark:text-green-400">
              {t("HOME.CHAT.MOCK.MODEL")}
            </span>
          </div>
          <div className="flex-1" />
          <Icon
            name="ellipsis-vertical"
            className="text-muted-foreground h-3.5 w-3.5"
          />
        </div>

        {/* message */}
        <div className="flex-1 space-y-2 overflow-hidden px-4 py-3">
          <div className="text-muted-foreground/70 font-mono text-[9px] tracking-wider uppercase">
            {t("HOME.CHAT.MOCK.CHARACTER")}
          </div>
          <p className="text-foreground/90 line-clamp-5 text-[13px] leading-relaxed">
            {t("HOME.CHAT.MOCK.MSG_AI")}
          </p>
          <div className="text-muted-foreground/60 flex items-center gap-2 pt-1 font-mono text-[9px]">
            <Icon name="copy" className="h-3 w-3" />
            <Icon name="refresh-cw" className="h-3 w-3" />
            <Icon name="pencil" className="h-3 w-3" />
            <span className="ml-auto tabular-nums">
              {t("HOME.CHAT.MOCK.TOKENS")}
            </span>
          </div>
        </div>

        {/* input */}
        <div className="border-border/60 border-t px-3 py-2.5">
          <div className="border-border bg-background/60 text-muted-foreground rounded border px-3 py-2 font-mono text-[10px]">
            {t("HOME.CHAT.MOCK.INPUT")}
          </div>
        </div>

        {/* RP feature menu, floating like the real one */}
        <div className="border-border bg-popover absolute top-9 right-2 w-44 overflow-hidden rounded-md border shadow-xl">
          <div className="border-border/50 text-muted-foreground border-b px-3 py-1.5 font-mono text-[8px] tracking-[0.2em] uppercase">
            {t("HOME.CHAT.MOCK.MENU_LABEL")}
          </div>
          {menu.map((m) => (
            <div
              key={m.label}
              className={`flex items-center gap-2.5 px-3 py-1.5 ${m.accent ? "bg-purple-500/10" : ""}`}
            >
              <Icon
                name={m.icon}
                className={`h-3 w-3 shrink-0 ${m.accent ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}
              />
              <span className="text-foreground/90 font-sans text-[11px]">
                {m.label}
              </span>
            </div>
          ))}
          <div className="border-border/50 flex items-center gap-2.5 border-t px-3 py-1.5">
            <Icon name="database" className="text-muted-foreground h-3 w-3" />
            <span className="text-foreground/90 font-sans text-[11px]">
              {t("HOME.CHAT.MOCK.LOCAL_DB")}
            </span>
          </div>
        </div>
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
