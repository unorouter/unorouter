import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { LuActivity, LuGlobe, LuShield, LuZap } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function PricingSection() {
  const t = await getTranslations();

  return (
    <section className="relative z-10 py-24 border-t border-white/5 bg-linear-to-b from-[#050505] to-[#0a0a0a]">
      <div className="max-w-360 mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 rounded-sm mb-6">
            <LuZap className="h-3 w-3 text-purple-400" />
            <span className="text-[10px] font-mono text-purple-400 tracking-[0.2em] uppercase">
              {t("HOME.PRICING_LABEL")}
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-4">
            {t("HOME.PRICING_TITLE")}
            <br />
            <span className="text-gray-500">
              {t("HOME.PRICING_SUBTITLE")}
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto font-mono text-sm leading-relaxed">
            {t("HOME.PRICING_DESCRIPTION")}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <PricingTile
            name={t("HOME.PRICING_PAYG_NAME")}
            price={t("HOME.PRICING_PAYG_PRICE")}
            description={t("HOME.PRICING_PAYG_DESC")}
            endpoint={t("HOME.PRICING_PAYG_ENDPOINT")}
          />
          <PricingTile
            name={t("HOME.PRICING_BASIC_NAME")}
            price={t("HOME.PRICING_BASIC_PRICE")}
            description={t("HOME.PRICING_BASIC_DESC")}
            endpoint={t("HOME.PRICING_BASIC_RATE")}
          />
          <PricingTile
            name={t("HOME.PRICING_PRO_NAME")}
            price={t("HOME.PRICING_PRO_PRICE")}
            description={t("HOME.PRICING_PRO_DESC")}
            endpoint={t("HOME.PRICING_PRO_RATE")}
            highlight
          />
          <PricingTile
            name={t("HOME.PRICING_ENTERPRISE_NAME")}
            price={t("HOME.PRICING_ENTERPRISE_PRICE")}
            description={t("HOME.PRICING_ENTERPRISE_DESC")}
            endpoint={t("HOME.PRICING_ENTERPRISE_RATE")}
          />
        </div>

        {/* Feature details */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 font-mono">
                {t("HOME.FEATURES_TITLE")}
              </h3>
              <p className="text-gray-400 font-mono text-sm leading-relaxed mb-6">
                {t("HOME.FEATURES_DESCRIPTION")}
              </p>
            </div>

            <div className="space-y-4">
              <FeatureRow
                icon={<LuShield className="h-3.5 w-3.5 text-purple-400" />}
                title={t("HOME.FEATURE_FAILOVER_TITLE")}
                description={t("HOME.FEATURE_FAILOVER_DESC")}
              />
              <FeatureRow
                icon={<LuGlobe className="h-3.5 w-3.5 text-purple-400" />}
                title={t("HOME.FEATURE_MULTIPROTOCOL_TITLE")}
                description={t("HOME.FEATURE_MULTIPROTOCOL_DESC")}
              />
              <FeatureRow
                icon={<LuActivity className="h-3.5 w-3.5 text-purple-400" />}
                title={t("HOME.FEATURE_LOADBALANCE_TITLE")}
                description={t("HOME.FEATURE_LOADBALANCE_DESC")}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
              <a
                href="https://api.unorouter.ai/register"
                className="h-11 px-8 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <LuZap className="h-3.5 w-3.5" />
                {t("HOME.PRICING_CTA_GET_STARTED")}
              </a>
              <Link
                href="/pricing"
                className="h-11 px-6 bg-transparent border border-white/20 text-white font-mono text-xs font-bold uppercase tracking-widest hover:border-white transition-all flex items-center gap-2"
              >
                {t("HOME.PRICING_CTA_VIEW_PLANS")}
              </Link>
            </div>
          </div>

          {/* Info panels */}
          <div className="space-y-6">
            <div className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
                <span className="text-[10px] text-purple-400 uppercase tracking-wider font-mono">
                  {t("HOME.PRICING_PROVIDERS_TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-mono">
                    {t("HOME.PRICING_PROVIDERS_ACTIVE")}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <ProviderRow
                  name="OpenAI"
                  icon="/icons/openai.svg"
                  tag="GPT"
                  tagColor="green"
                  description={t("HOME.PRICING_PROVIDERS_DESC_OPENAI")}
                />
                <ProviderRow
                  name="Anthropic"
                  icon="/icons/anthropic.svg"
                  tag="CLAUDE"
                  tagColor="orange"
                  description={t("HOME.PRICING_PROVIDERS_DESC_ANTHROPIC")}
                />
                <ProviderRow
                  name="Google"
                  icon="/icons/google.svg"
                  tag="GEMINI"
                  tagColor="blue"
                  description={t("HOME.PRICING_PROVIDERS_DESC_GOOGLE")}
                />
                <ProviderRow
                  name="DeepSeek"
                  icon="/icons/deepseek.svg"
                  tag="DS"
                  tagColor="purple"
                  description={t("HOME.PRICING_PROVIDERS_DESC_DEEPSEEK")}
                />
              </div>
            </div>

            <div className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                  {t("HOME.PRICING_FLOW_TITLE")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] text-purple-400 font-mono">
                    {t("HOME.PRICING_FLOW_LIVE")}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 font-mono text-xs">
                <FlowStep step="1" text={t("HOME.PRICING_FLOW_STEP1")} />
                <FlowStep step="2" text={t("HOME.PRICING_FLOW_STEP2")} muted />
                <FlowStep step="✓" text={t("HOME.PRICING_FLOW_STEP3")} success />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingTile(props: {
  name: string;
  price: string;
  description: string;
  endpoint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-5 bg-white/2 border rounded-lg hover:border-purple-500/50 transition-all group ${props.highlight ? "border-purple-500/50" : "border-white/10"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-white uppercase tracking-wide">
          {props.name}
        </span>
        <span className="text-purple-400 font-mono text-sm font-bold">
          {props.price}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 font-mono leading-relaxed mb-3">
        {props.description}
      </p>
      <code className="text-[9px] text-gray-600 bg-black/30 px-2 py-1 rounded block truncate">
        {props.endpoint}
      </code>
    </div>
  );
}

function FeatureRow(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-300 group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-purple-500/50 transition-colors">
        {props.icon}
      </div>
      <div>
        <span className="font-mono text-xs uppercase tracking-wide block">
          {props.title}
        </span>
        <span className="text-[10px] text-gray-500">{props.description}</span>
      </div>
    </div>
  );
}

function ProviderRow(props: {
  name: string;
  icon: string;
  tag: string;
  tagColor: string;
  description: string;
}) {
  const colorMap: Record<string, string> = {
    green: "bg-green-500/5 border-green-500/20 text-green-400 bg-green-500/20",
    orange:
      "bg-orange-500/5 border-orange-500/20 text-orange-400 bg-orange-500/20",
    blue: "bg-blue-500/5 border-blue-500/20 text-blue-400 bg-blue-500/20",
    purple:
      "bg-purple-500/5 border-purple-500/20 text-purple-400 bg-purple-500/20"
  };
  const colors = colorMap[props.tagColor] || colorMap.green;
  const [bgRow, borderRow, textColor, tagBg] = colors.split(" ");

  return (
    <div
      className={`flex items-center gap-4 p-4 ${bgRow} border ${borderRow} rounded-lg`}
    >
      <Image
        src={props.icon}
        alt={props.name}
        width={20}
        height={20}
        className="w-5 h-5 rounded object-contain shrink-0"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm text-white font-bold">
            {props.name}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 ${tagBg} ${textColor} rounded-full uppercase tracking-wider`}
          >
            {props.tag}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 font-mono">
          {props.description}
        </p>
      </div>
    </div>
  );
}

function FlowStep(props: {
  step: string;
  text: string;
  muted?: boolean;
  success?: boolean;
}) {
  const bgColor = props.success ? "bg-green-500/20" : "bg-purple-500/20";
  const textColor = props.success ? "text-green-400" : "text-purple-400";
  const labelColor = props.success
    ? "text-green-400"
    : props.muted
      ? "text-gray-500"
      : "text-white";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full ${bgColor} flex items-center justify-center ${textColor} text-[9px] font-bold`}
      >
        {props.step}
      </div>
      <div className="flex-1">
        <span className={`${labelColor} text-[11px]`}>{props.text}</span>
      </div>
    </div>
  );
}
