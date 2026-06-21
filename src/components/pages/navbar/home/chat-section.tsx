import { Link } from "@/i18n/navigation";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import {
  ChatMockView,
  DEFAULT_MOCK_STATE,
  type MockData,
  type MockModel,
} from "./chat-mock-view";
import { ChatMockLazy } from "./chat-mock-lazy";

const vendorOf = (m: { vendor: string | { name?: string } }): string =>
  typeof m.vendor === "string" ? m.vendor : (m.vendor?.name ?? "");

export async function ChatSection() {
  const t = await getTranslations();
  const { models } = await getPricingSummary();
  // Real free CHAT models for the demo: drop embeddings/rerankers/audio + the `auto`
  // router alias that `type === "text"` lets slip through (they read odd in a chat pill).
  const NON_CHAT = /embed|bge|rerank|whisper|tts|moderation|^auto/i;
  const freeText = models.filter(
    (m) => m.type === "text" && m.isFree && !NON_CHAT.test(m.name),
  );
  const withVendor = freeText.filter((m) => vendorOf(m).length > 0);
  const pool = withVendor.length > 0 ? withVendor : freeText;
  const demoModels: MockModel[] = pool.slice(0, 4).map((m) => ({
    name: m.name,
    vendor: vendorOf(m) || m.name,
  }));
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
      },
      {
        vendor: "claude",
        label: t("HOME.CHAT.MOCK.CONV2"),
        message: t("HOME.CHAT.MOCK.MSG_AI_2"),
      },
      {
        vendor: "gemini",
        label: t("HOME.CHAT.MOCK.CONV3"),
        message: t("HOME.CHAT.MOCK.MSG_AI_3"),
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
    strings: {
      newChat: t("HOME.CHAT.MOCK.NEW_CHAT"),
      free: t("HOME.CHAT.MOCK.MODEL"),
      input: t("HOME.CHAT.MOCK.INPUT"),
      tokens: t("HOME.CHAT.MOCK.TOKENS"),
      menuLabel: t("HOME.CHAT.MOCK.MENU_LABEL"),
      localDb: t("HOME.CHAT.MOCK.LOCAL_DB"),
      newChatEmpty: t("HOME.CHAT.MOCK.NEW_CHAT_EMPTY"),
      demoUser: t("HOME.CHAT.MOCK.DEMO_USER"),
      demoAi: t("HOME.CHAT.MOCK.DEMO_AI"),
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
