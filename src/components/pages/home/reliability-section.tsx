import { Link } from "@/i18n/navigation";
import { LuCpu, LuLayers, LuRefreshCw, LuServer, LuShield } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function ReliabilitySection() {
  const t = await getTranslations();

  return (
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
