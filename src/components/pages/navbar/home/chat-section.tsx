import { Link } from "@/i18n/navigation";
import { getCachedFreeChatModels } from "@/lib/api/page-data";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import {
  ChatMockView,
  DEFAULT_MOCK_STATE,
  type MockData,
  type MockModel,
} from "./chat-mock-view";
import { ChatMockLazy } from "./chat-mock-lazy";

export async function ChatSection() {
  const t = await getTranslations();
  const demoModels: MockModel[] = await getCachedFreeChatModels(4);
  if (demoModels.length === 0) {
    demoModels.push({
      name: t("HOME.CHAT.MOCK.MODEL_NAME"),
      vendor: t("HOME.CHAT.MOCK.MODEL_NAME"),
    });
  }

  const data: MockData = {
    models: demoModels,
    convs: [
      {
        vendor: "nemotron",
        label: t("HOME.CHAT.MOCK.CONV1"),
        message: t("HOME.CHAT.MOCK.MSG_AI"),
        demoUser: t("HOME.CHAT.MOCK.DEMO_USER"),
        demoAi: t("HOME.CHAT.MOCK.DEMO_AI"),
        tokens: t("HOME.CHAT.MOCK.TOKENS", { in: 148, out: 297 }),
      },
      {
        vendor: "claude",
        label: t("HOME.CHAT.MOCK.CONV2"),
        message: t("HOME.CHAT.MOCK.MSG_AI_2"),
        demoUser: t("HOME.CHAT.MOCK.DEMO_USER_2"),
        demoAi: t("HOME.CHAT.MOCK.DEMO_AI_2"),
        tokens: t("HOME.CHAT.MOCK.TOKENS", { in: 312, out: 184 }),
      },
      {
        vendor: "gemini",
        label: t("HOME.CHAT.MOCK.CONV3"),
        message: t("HOME.CHAT.MOCK.MSG_AI_3"),
        demoUser: t("HOME.CHAT.MOCK.DEMO_USER_3"),
        demoAi: t("HOME.CHAT.MOCK.DEMO_AI_3"),
        tokens: t("HOME.CHAT.MOCK.TOKENS", { in: 95, out: 142 }),
      },
    ],
    menu: [
      { icon: "users", label: t("RP.SIDEBAR_TAB_CHARACTERS") },
      { icon: "user", label: t("RP.SIDEBAR_TAB_PERSONAS") },
      { icon: "book-text", label: t("RP.SIDEBAR_TAB_LOREBOOKS") },
      { icon: "sliders-horizontal", label: t("RP.SIDEBAR_TAB_PRESETS") },
      { icon: "layers", label: t("RP.SIDEBAR_TAB_CARDS") },
    ],
    dialogs: [
      {
        title: t("RP.SIDEBAR_TAB_CHARACTERS"),
        rows: [
          {
            name: t("HOME.CHAT.MOCK.CONV1"),
            sub: t("HOME.CHAT.MOCK.DLG.CHAR1"),
          },
          {
            name: t("HOME.CHAT.MOCK.CONV2"),
            sub: t("HOME.CHAT.MOCK.DLG.CHAR2"),
          },
          {
            name: t("HOME.CHAT.MOCK.CONV3"),
            sub: t("HOME.CHAT.MOCK.DLG.CHAR3"),
          },
        ],
      },
      {
        title: t("RP.SIDEBAR_TAB_PERSONAS"),
        rows: [
          {
            name: t("HOME.CHAT.MOCK.DLG.PERSONA1"),
            sub: t("HOME.CHAT.MOCK.DLG.PERSONA1_SUB"),
          },
          {
            name: t("HOME.CHAT.MOCK.DLG.PERSONA2"),
            sub: t("HOME.CHAT.MOCK.DLG.PERSONA2_SUB"),
          },
        ],
      },
      {
        title: t("RP.SIDEBAR_TAB_LOREBOOKS"),
        rows: [
          {
            name: t("HOME.CHAT.MOCK.DLG.LORE1"),
            sub: t("HOME.CHAT.MOCK.DLG.LORE1_SUB"),
          },
          {
            name: t("HOME.CHAT.MOCK.DLG.LORE2"),
            sub: t("HOME.CHAT.MOCK.DLG.LORE2_SUB"),
          },
        ],
      },
      {
        title: t("RP.SIDEBAR_TAB_PRESETS"),
        rows: [
          {
            name: t("HOME.CHAT.MOCK.DLG.PRESET1"),
            sub: t("HOME.CHAT.MOCK.DLG.PRESET1_SUB"),
          },
          {
            name: t("HOME.CHAT.MOCK.DLG.PRESET2"),
            sub: t("HOME.CHAT.MOCK.DLG.PRESET2_SUB"),
          },
        ],
      },
      {
        title: t("RP.SIDEBAR_TAB_CARDS"),
        rows: [
          {
            name: t("HOME.CHAT.MOCK.DLG.CARD1"),
            sub: t("HOME.CHAT.MOCK.DLG.CARD1_SUB"),
          },
          {
            name: t("HOME.CHAT.MOCK.DLG.CARD2"),
            sub: t("HOME.CHAT.MOCK.DLG.CARD2_SUB"),
          },
        ],
      },
      {
        title: t("HOME.CHAT.MOCK.LOCAL_DB"),
        rows: [
          {
            name: t("HOME.CHAT.MOCK.DLG.DB1"),
            sub: t("HOME.CHAT.MOCK.DLG.DB1_SUB"),
          },
          {
            name: t("HOME.CHAT.MOCK.DLG.DB2"),
            sub: t("HOME.CHAT.MOCK.DLG.DB2_SUB"),
          },
        ],
      },
    ],
    newChat: {
      title: t("HOME.CHAT.MOCK.NEW_CONV_TITLE"),
      demoUser: t("HOME.CHAT.MOCK.NEW_DEMO_USER"),
      demoAi: t("HOME.CHAT.MOCK.NEW_DEMO_AI"),
      tokens: t("HOME.CHAT.MOCK.TOKENS", { in: 64, out: 128 }),
    },
    strings: {
      newChat: t("HOME.CHAT.MOCK.NEW_CHAT"),
      free: t("HOME.CHAT.MOCK.MODEL"),
      input: t("HOME.CHAT.MOCK.INPUT"),
      tokens: t("HOME.CHAT.MOCK.TOKENS", { in: 64, out: 128 }),
      menuLabel: t("HOME.CHAT.MOCK.MENU_LABEL"),
      localDb: t("HOME.CHAT.MOCK.LOCAL_DB"),
      newChatEmpty: t("HOME.CHAT.MOCK.NEW_CHAT_EMPTY"),
    },
  };

  return (
    <section className="border-border/50 relative border-t py-16 lg:py-32">
      <div className="mx-auto max-w-360 px-6">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            {/* Static SSR shell (first paint, no FOUC); the lazy animated layer takes over
                client-side and self-plays the demo. */}
            <div className="lg:hidden">
              <ChatMockView data={data} state={DEFAULT_MOCK_STATE} />
            </div>
            <div className="hidden lg:block">
              <ChatMockLazy data={data} />
            </div>
            <div className="absolute -inset-px -z-10 rounded-xl bg-linear-to-br from-cyan-500/20 via-transparent to-cyan-500/10 opacity-60 blur-2xl" />
          </div>

          <div className="order-1 space-y-6 lg:order-2 lg:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-sm border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
              <Icon
                name="message-circle"
                className="h-3 w-3 text-cyan-700 dark:text-cyan-400"
              />
              <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-400">
                {t("HOME.CHAT.BADGE")}
              </span>
            </div>
            <h2 className="text-4xl font-bold tracking-tighter md:text-5xl">
              {t("HOME.CHAT.TITLE_1")}
              <br />
              <span className="text-cyan-600 dark:text-cyan-400">
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
                color="cyan"
              />
              <FeatureCard
                icon="users"
                title={t("HOME.CHAT.CARD2.TITLE")}
                description={t("HOME.CHAT.CARD2.DESC")}
                color="emerald"
              />
              <FeatureCard
                icon="lock"
                title={t("HOME.CHAT.CARD3.TITLE")}
                description={t("HOME.CHAT.CARD3.DESC")}
                color="blue"
              />
              <FeatureCard
                icon="drama"
                title={t("HOME.CHAT.CARD4.TITLE")}
                description={t("HOME.CHAT.CARD4.DESC")}
                color="rose"
              />
            </div>

            <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row">
              <Link
                href="/chat"
                className="flex h-11 items-center gap-2 bg-linear-to-r from-cyan-500 to-cyan-600 px-6 font-mono text-xs font-bold tracking-widest text-white uppercase transition-all hover:from-cyan-400 hover:to-cyan-500"
              >
                <Icon name="message-circle" className="h-3.5 w-3.5" />
                {t("HOME.CHAT.CTA_OPEN")}
              </Link>
              <Link
                href="/docs/integrations/sillytavern"
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

type CardColor = "cyan" | "emerald" | "blue" | "rose";

const CARD_COLORS: Record<
  CardColor,
  { ring: string; tile: string; icon: string }
> = {
  cyan: {
    ring: "hover:border-cyan-500/40",
    tile: "bg-cyan-500/15",
    icon: "text-cyan-700 dark:text-cyan-400",
  },
  emerald: {
    ring: "hover:border-emerald-500/40",
    tile: "bg-emerald-500/15",
    icon: "text-emerald-700 dark:text-emerald-400",
  },
  blue: {
    ring: "hover:border-blue-500/40",
    tile: "bg-blue-500/15",
    icon: "text-blue-700 dark:text-blue-400",
  },
  rose: {
    ring: "hover:border-rose-500/40",
    tile: "bg-rose-500/15",
    icon: "text-rose-700 dark:text-rose-400",
  },
};

function FeatureCard(props: {
  icon: string;
  title: string;
  description: string;
  color: CardColor;
}) {
  const c = CARD_COLORS[props.color];
  return (
    <div
      className={`border-border bg-accent/60 rounded-lg border p-4 backdrop-blur-sm transition-colors ${c.ring}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tile}`}
        >
          <Icon name={props.icon} className={`h-3.5 w-3.5 ${c.icon}`} />
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
