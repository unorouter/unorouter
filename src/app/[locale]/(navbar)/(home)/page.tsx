import { CodeBlock } from "@/components/code-block";
import { ModelTicker } from "@/components/model-ticker";
import { Link } from "@/i18n/navigation";
import { fetchPricing, processModels } from "@/lib/api/pricing";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Cpu,
  Globe,
  Layers,
  RefreshCw,
  Server,
  Shield,
  Terminal,
  Zap
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations();

  let models: { name: string; vendor: string }[] = [];
  let modelCount = 0;
  let vendorCount = 0;

  try {
    const pricing = await fetchPricing();
    const processed = processModels(pricing);
    models = processed.map((m) => ({ name: m.name, vendor: m.vendor.name }));
    modelCount = processed.length;
    vendorCount = new Set(pricing.vendors.map((v) => v.name)).size;
  } catch {
    modelCount = 200;
    vendorCount = 35;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden font-sans">
      {/* Hero */}
      <main className="relative z-10 pt-48 pb-32 px-6 max-w-360 mx-auto flex flex-col lg:flex-row items-center gap-20">
        {/* Left column */}
        <div className="flex-1 w-full text-center lg:text-left space-y-10">
          <div className="space-y-6">
            {/* Status badge */}
            <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-white/10 bg-white/3 backdrop-blur-md rounded-sm">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              <span className="text-[10px] font-mono text-gray-400 tracking-[0.2em] uppercase">
                {t("HOME.HERO_BADGE")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white leading-[1.05]">
              {t("HOME.HERO_TITLE_LINE1")} <br />
              <span className="text-gray-500">
                <span className="font-mono tracking-wider">
                  {t("HOME.HERO_TITLE_LINE2")}
                </span>
              </span>
              .
            </h1>

            {/* Description */}
            <p className="text-base text-gray-400 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed font-mono">
              {t("HOME.HERO_SUBTITLE")}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 font-mono text-xs">
            <a
              href="https://api.unorouter.ai/register"
              className="h-11 px-8 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Zap className="h-3.5 w-3.5" />
              {t("HOME.HERO_CTA_PRIMARY")}
            </a>
            <Link
              href="/models"
              className="h-11 px-8 bg-transparent border border-white/20 text-white font-bold uppercase tracking-widest hover:border-white transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              {t("HOME.HERO_CTA_SECONDARY")}
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-0 border-t border-white/10 w-full">
            <StatCard
              label={t("HOME.STATS_MODELS")}
              value={String(modelCount)}
              indicator="Global"
            />
            <StatCard
              label={t("HOME.STATS_PROVIDERS")}
              value={`${vendorCount}+`}
              indicator="Integrated"
            />
            <StatCard
              label={t("HOME.STATS_UPTIME")}
              value="99.9%"
              indicator="SLA Guarantee"
            />
          </div>
        </div>

        {/* Right column - Stats panel */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center lg:justify-end">
          <div className="w-full max-w-lg mx-auto lg:mx-0 flex flex-col gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
            {/* Requests served */}
            <div className="bg-[#0A0A0A]/80 p-8 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Requests Served
                </span>
                <Activity className="h-3.5 w-3.5 text-gray-600" />
              </div>
              <div className="text-4xl md:text-5xl lg:text-5xl font-bold text-white tracking-tight tabular-nums">
                847,291,053
              </div>
            </div>

            {/* Sub-stats */}
            <div className="grid grid-cols-2 gap-px bg-white/10">
              <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                  Avg Latency
                </span>
                <div>
                  <div className="text-2xl font-bold text-white tabular-nums mb-2">
                    38ms
                  </div>
                  <div className="w-full h-0.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white animate-width-expand" />
                  </div>
                </div>
              </div>
              <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                  Avg Cost / 1M
                </span>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">$0.42</span>
                    <span className="text-xs text-gray-600 line-through">
                      $2.00
                    </span>
                  </div>
                  <span className="text-[10px] text-green-500 mt-1 font-mono">
                    79% Savings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Claude Code Integration Banner */}
      <section className="relative py-8 px-6 border-t border-b border-white/5 bg-linear-to-r from-orange-600/5 via-transparent to-orange-600/5">
        <div className="max-w-360 mx-auto">
          <Link
            href="/docs/claude-code"
            className="group flex flex-col md:flex-row items-center justify-between gap-6 py-4 px-6 md:px-10 rounded-lg border border-orange-600/20 bg-black/40 backdrop-blur-sm hover:border-orange-600/50 hover:bg-orange-600/5 transition-all duration-300"
          >
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-orange-600/20 blur-xl rounded-full" />
                <Terminal className="relative h-12 w-12 text-orange-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-orange-600/20 text-orange-500 rounded">
                    {t("HOME.INTEGRATION_BADGE")}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  {t("HOME.INTEGRATION_TITLE")}
                </h3>
                <p className="text-sm text-gray-400 font-mono mt-1">
                  {t("HOME.INTEGRATION_DESCRIPTION")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-white/70 group-hover:text-white transition-colors">
                View Guide
              </span>
              <div className="w-10 h-10 rounded-full border border-orange-600/30 flex items-center justify-center group-hover:bg-orange-600 group-hover:border-orange-600 transition-all">
                <ArrowRight className="h-4 w-4 text-orange-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Model Ticker */}
      {models.length > 0 && <ModelTicker models={models} />}

      {/* Pricing Plans Section */}
      <section className="relative z-10 py-24 border-t border-white/5 bg-linear-to-b from-[#050505] to-[#0a0a0a]">
        <div className="max-w-360 mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 rounded-sm mb-6">
              <Zap className="h-3 w-3 text-purple-400" />
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
              name="Pay As You Go"
              price="$0"
              description="No minimum. Top up and use any model."
              endpoint="/v1/chat/completions"
            />
            <PricingTile
              name="Basic"
              price="$20/mo"
              description="$30 credit value. 1.5x multiplier."
              endpoint="100 req/min"
            />
            <PricingTile
              name="Pro"
              price="$50/mo"
              description="$75 credit value. Priority routing."
              endpoint="500 req/min"
              highlight
            />
            <PricingTile
              name="Enterprise"
              price="$100/mo"
              description="$175 credit value. Dedicated support."
              endpoint="2,000 req/min"
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
                  icon={<Shield className="h-3.5 w-3.5 text-purple-400" />}
                  title={t("HOME.FEATURE_FAILOVER_TITLE")}
                  description={t("HOME.FEATURE_FAILOVER_DESC")}
                />
                <FeatureRow
                  icon={<Globe className="h-3.5 w-3.5 text-purple-400" />}
                  title={t("HOME.FEATURE_MULTIPROTOCOL_TITLE")}
                  description={t("HOME.FEATURE_MULTIPROTOCOL_DESC")}
                />
                <FeatureRow
                  icon={<Activity className="h-3.5 w-3.5 text-purple-400" />}
                  title={t("HOME.FEATURE_LOADBALANCE_TITLE")}
                  description={t("HOME.FEATURE_LOADBALANCE_DESC")}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
                <a
                  href="https://api.unorouter.ai/register"
                  className="h-11 px-8 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Get Started
                </a>
                <Link
                  href="/pricing"
                  className="h-11 px-6 bg-transparent border border-white/20 text-white font-mono text-xs font-bold uppercase tracking-widest hover:border-white transition-all flex items-center gap-2"
                >
                  View All Plans
                </Link>
              </div>
            </div>

            {/* Info panels */}
            <div className="space-y-6">
              <div className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
                  <span className="text-[10px] text-purple-400 uppercase tracking-wider font-mono">
                    Supported Providers
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-400 font-mono">
                      Active
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <ProviderRow
                    name="OpenAI"
                    tag="GPT"
                    tagColor="green"
                    description="GPT-4o, o1, o3, GPT-4.1"
                  />
                  <ProviderRow
                    name="Anthropic"
                    tag="CLAUDE"
                    tagColor="orange"
                    description="Claude Opus, Sonnet, Haiku"
                  />
                  <ProviderRow
                    name="Google"
                    tag="GEMINI"
                    tagColor="blue"
                    description="Gemini 2.5 Pro, Flash"
                  />
                  <ProviderRow
                    name="DeepSeek"
                    tag="DS"
                    tagColor="purple"
                    description="DeepSeek V3, R1"
                  />
                </div>
              </div>

              <div className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                    Request Flow
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] text-purple-400 font-mono">
                      Live
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-3 font-mono text-xs">
                  <FlowStep step="1" text="POST /v1/chat/completions" />
                  <FlowStep step="2" text="Route to fastest provider" muted />
                  <FlowStep step="✓" text="Response delivered" success />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reliability Section */}
      <section className="relative py-32 px-6 border-t border-white/5">
        <div className="max-w-360 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 bg-cyan-500/10 rounded-sm">
                <RefreshCw className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-mono text-cyan-400 tracking-[0.2em] uppercase">
                  {t("HOME.RELIABILITY_BADGE")}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
                {t("HOME.RELIABILITY_TITLE_1")}
                <br />
                <span className="text-cyan-400">
                  {t("HOME.RELIABILITY_TITLE_2")}
                </span>
              </h2>
              <p className="text-gray-400 font-mono text-sm leading-relaxed max-w-lg">
                {t("HOME.RELIABILITY_DESCRIPTION")}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <InfoCard
                  icon={<Layers className="h-3.5 w-3.5 text-cyan-400" />}
                  title={t("HOME.RELIABILITY_CARD1_TITLE")}
                  description={t("HOME.RELIABILITY_CARD1_DESC")}
                  color="cyan"
                />
                <InfoCard
                  icon={<Server className="h-3.5 w-3.5 text-purple-400" />}
                  title={t("HOME.RELIABILITY_CARD2_TITLE")}
                  description={t("HOME.RELIABILITY_CARD2_DESC")}
                  color="purple"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
                <a
                  href="https://api.unorouter.ai/register"
                  className="h-11 px-6 bg-linear-to-r from-cyan-500 to-cyan-600 text-black font-mono text-xs font-bold uppercase tracking-widest hover:from-cyan-400 hover:to-cyan-500 transition-all flex items-center gap-2"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {t("HOME.HERO_CTA_PRIMARY")}
                </a>
                <Link
                  href="/docs/claude-code"
                  className="h-11 px-6 bg-transparent border border-white/20 text-white font-mono text-xs font-bold uppercase tracking-widest hover:border-white transition-all flex items-center gap-2"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Architecture panel */}
            <div className="relative">
              <div className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-cyan-500/10 border-b border-cyan-500/20">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-mono">
                    Architecture
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Active
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4 font-mono text-xs">
                  <ArchStep
                    step="1"
                    title="Unified Endpoint"
                    description="Single API for OpenAI, Anthropic, Gemini formats"
                  />
                  <ArchStep
                    step="2"
                    title="Smart Routing"
                    description="Selects fastest provider based on latency and availability"
                  />
                  <ArchStep
                    step="3"
                    title="Automatic Failover"
                    description="Failed requests retry on alternate channels instantly"
                  />
                  <ArchStep
                    step="✓"
                    title="Always Delivered"
                    description="99.9% uptime SLA across all models"
                    success
                  />
                </div>
                <div className="px-6 pb-6">
                  <div className="p-3 bg-black/50 border border-white/5 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="h-2.5 w-2.5 text-gray-500" />
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                        Supported Formats
                      </span>
                    </div>
                    <code className="text-[10px] text-cyan-400 break-all">
                      {`{ "openai": "/v1/chat/completions", "anthropic": "/v1/messages", "gemini": "/v1/models" }`}
                    </code>
                    <p className="text-[9px] text-gray-600 mt-2">
                      All formats auto-detected and routed to the right
                      provider.
                    </p>
                  </div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-px bg-linear-to-r from-cyan-500/20 via-transparent to-purple-500/20 rounded-lg blur-xl opacity-50 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="relative z-10 py-32 border-t border-white/5 bg-[#050505]">
        <div className="max-w-360 mx-auto px-6 flex flex-col lg:flex-row gap-20">
          <div className="flex-1 space-y-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight">
              {t("HOME.CODE_TITLE_1")}
              <br />
              <span className="text-gray-600">{t("HOME.CODE_TITLE_2")}</span>
            </h2>
            <p className="text-gray-400 max-w-md font-mono text-sm leading-relaxed">
              {t("HOME.CODE_DESCRIPTION")}
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 text-sm text-gray-300 group">
                <div className="w-6 h-6 rounded flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-colors">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="font-mono text-xs uppercase tracking-wide">
                  {t("HOME.CODE_FEATURE_1")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-300 group">
                <div className="w-6 h-6 rounded flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-colors">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="font-mono text-xs uppercase tracking-wide">
                  {t("HOME.CODE_FEATURE_2")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-300 group">
                <div className="w-6 h-6 rounded flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-colors">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="font-mono text-xs uppercase tracking-wide">
                  {t("HOME.CODE_FEATURE_3")}
                </span>
              </div>
            </div>

            <Link
              href="/docs/claude-code"
              className="flex items-center gap-2 text-white border-b border-white pb-1 font-mono text-xs hover:text-gray-300 hover:border-gray-300 transition-colors uppercase tracking-widest font-bold w-fit"
            >
              Read Full API Docs
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-1 relative pt-8 lg:pt-0">
            <CodeBlock
              language="bash"
              code={`curl -X POST https://api.unorouter.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d {
    "model": "claude-sonnet-4-6",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true
  }`}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 border-t border-white/5">
        <div className="max-w-360 mx-auto text-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
              {t("HOME.CTA_TITLE_1")}{" "}
              <span className="text-purple-400">{t("HOME.CTA_TITLE_2")}</span>?
            </h2>
            <p className="text-gray-400 font-mono text-sm max-w-xl mx-auto">
              {t("HOME.CTA_SUBTITLE")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 font-mono text-xs pt-4">
              <a
                href="https://api.unorouter.ai/register"
                className="h-12 px-10 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {t("HOME.CTA_PRIMARY")}
              </a>
              <Link
                href="/docs/claude-code"
                className="h-12 px-10 bg-transparent border border-white/20 text-white font-bold uppercase tracking-widest hover:border-white transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
              >
                {t("HOME.CTA_SECONDARY")}
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard(props: { label: string; value: string; indicator: string }) {
  return (
    <div className="flex flex-col border border-white/10 p-5 hover:bg-white/2 transition-colors duration-300 cursor-default">
      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
        {props.label}
      </span>
      <span className="text-2xl font-bold text-white tracking-tight">
        {props.value}
      </span>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-1 h-1 bg-green-500 rounded-full" />
        <span className="text-[10px] font-mono text-gray-400">
          {props.indicator}
        </span>
      </div>
    </div>
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

function InfoCard(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "cyan" | "purple";
}) {
  const bgColor =
    props.color === "cyan" ? "bg-cyan-500/20" : "bg-purple-500/20";

  return (
    <div className="p-4 border border-white/10 bg-white/2 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}
        >
          {props.icon}
        </div>
        <span className="font-mono text-xs text-white uppercase tracking-wider">
          {props.title}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
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
  const stepColor = props.success ? "text-green-400" : "text-cyan-400";
  const titleColor = props.success ? "text-green-400" : "text-white";

  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center ${stepColor} text-[10px] font-bold shrink-0 mt-0.5`}
      >
        {props.step}
      </div>
      <div>
        <div className={`${titleColor} mb-1`}>{props.title}</div>
        <div className="text-gray-500">{props.description}</div>
      </div>
    </div>
  );
}
