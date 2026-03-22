import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function CodeSection() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 bg-background relative z-10 border-t py-16 lg:py-32">
      <div className="mx-auto flex max-w-360 flex-col gap-10 px-6 lg:gap-20 lg:flex-row">
        <div className="flex-1 space-y-6 lg:space-y-10">
          <h2 className="text-foreground text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
            {t("HOME.CODE_TITLE_1")}
            <br />
            <span className="text-muted-foreground">
              {t("HOME.CODE_TITLE_2")}
            </span>
          </h2>
          <p className="text-muted-foreground max-w-md font-mono text-sm leading-relaxed">
            {t("HOME.CODE_DESCRIPTION")}
          </p>

          <div className="space-y-4 pt-4">
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="border-border group-hover:border-foreground/30 flex h-6 w-6 items-center justify-center rounded border transition-colors">
                <LuCheck className="text-foreground h-3 w-3" />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE_FEATURE_1")}
              </span>
            </div>
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="border-border group-hover:border-foreground/30 flex h-6 w-6 items-center justify-center rounded border transition-colors">
                <LuCheck className="text-foreground h-3 w-3" />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE_FEATURE_2")}
              </span>
            </div>
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="border-border group-hover:border-foreground/30 flex h-6 w-6 items-center justify-center rounded border transition-colors">
                <LuCheck className="text-foreground h-3 w-3" />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE_FEATURE_3")}
              </span>
            </div>
          </div>

          <Link
            href="/docs/claude-code"
            className="text-foreground border-foreground hover:text-muted-foreground hover:border-muted-foreground flex w-fit items-center gap-2 border-b pb-1 font-mono text-xs font-bold tracking-widest uppercase transition-colors"
          >
            {t("HOME.CODE_READ_DOCS")}
            <LuArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="relative flex-1 pt-8 lg:pt-0">
          <CodeBlock
            language="bash"
            code={`curl -X POST ${process.env.NEXT_PUBLIC_API_URL}/v1/chat/completions \\
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
