import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function CodeSection() {
  const t = await getTranslations();

  return (
    <section className="relative z-10 py-32 border-t border-border/50 bg-background">
      <div className="max-w-360 mx-auto px-6 flex flex-col lg:flex-row gap-20">
        <div className="flex-1 space-y-10">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
            {t("HOME.CODE_TITLE_1")}
            <br />
            <span className="text-muted-foreground">{t("HOME.CODE_TITLE_2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-md font-mono text-sm leading-relaxed">
            {t("HOME.CODE_DESCRIPTION")}
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4 text-sm text-foreground group">
              <div className="w-6 h-6 rounded flex items-center justify-center border border-border group-hover:border-foreground/30 transition-colors">
                <LuCheck className="h-3 w-3 text-foreground" />
              </div>
              <span className="font-mono text-xs uppercase tracking-wide">
                {t("HOME.CODE_FEATURE_1")}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground group">
              <div className="w-6 h-6 rounded flex items-center justify-center border border-border group-hover:border-foreground/30 transition-colors">
                <LuCheck className="h-3 w-3 text-foreground" />
              </div>
              <span className="font-mono text-xs uppercase tracking-wide">
                {t("HOME.CODE_FEATURE_2")}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground group">
              <div className="w-6 h-6 rounded flex items-center justify-center border border-border group-hover:border-foreground/30 transition-colors">
                <LuCheck className="h-3 w-3 text-foreground" />
              </div>
              <span className="font-mono text-xs uppercase tracking-wide">
                {t("HOME.CODE_FEATURE_3")}
              </span>
            </div>
          </div>

          <Link
            href="/docs/claude-code"
            className="flex items-center gap-2 text-foreground border-b border-foreground pb-1 font-mono text-xs hover:text-muted-foreground hover:border-muted-foreground transition-colors uppercase tracking-widest font-bold w-fit"
          >
            {t("HOME.CODE_READ_DOCS")}
            <LuArrowRight className="h-3.5 w-3.5" />
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
  );
}
