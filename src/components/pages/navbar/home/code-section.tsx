import { CodeBlock } from "@/components/elements/code/code-block";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/config/env";
import { getDocsApiKey } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function CodeSection() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  return (
    <section className="border-border/50 bg-background relative z-10 border-t py-16 lg:py-32">
      <div className="mx-auto flex max-w-360 flex-col gap-10 px-6 lg:flex-row lg:gap-20">
        <div className="flex-1 space-y-6 lg:space-y-10">
          <h2 className="text-foreground text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
            {t("HOME.CODE.TITLE_1")}
            <br />
            <span className="text-muted-foreground">
              {t("HOME.CODE.TITLE_2")}
            </span>
          </h2>
          <p className="text-muted-foreground max-w-md font-mono text-sm leading-relaxed">
            {t("HOME.CODE.DESCRIPTION")}
          </p>

          <div className="space-y-4 pt-4">
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="border-border group-hover:border-foreground/30 flex h-6 w-6 items-center justify-center rounded border transition-colors">
                <Icon name="check" className="text-foreground h-3 w-3" />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE.FEATURE_1")}
              </span>
            </div>
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="border-border group-hover:border-foreground/30 flex h-6 w-6 items-center justify-center rounded border transition-colors">
                <Icon name="check" className="text-foreground h-3 w-3" />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE.FEATURE_2")}
              </span>
            </div>
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="border-border group-hover:border-foreground/30 flex h-6 w-6 items-center justify-center rounded border transition-colors">
                <Icon name="check" className="text-foreground h-3 w-3" />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE.FEATURE_3")}
              </span>
            </div>
            <div className="text-foreground group flex items-center gap-4 text-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded border border-purple-500/40 bg-purple-500/10 transition-colors group-hover:border-purple-500/60">
                <Icon
                  name="check"
                  className="h-3 w-3 text-purple-600 dark:text-purple-400"
                />
              </div>
              <span className="font-mono text-xs tracking-wide uppercase">
                {t("HOME.CODE.FEATURE_4")}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/docs/claude-code"
              className="text-foreground border-foreground hover:text-muted-foreground hover:border-muted-foreground flex w-fit items-center gap-2 border-b pb-1 font-mono text-xs font-bold tracking-widest uppercase transition-colors"
            >
              {t("HOME.CODE.READ_DOCS")}
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/chat"
              className="flex w-fit items-center gap-2 border-b border-purple-500/60 pb-1 font-mono text-xs font-bold tracking-widest text-purple-600 uppercase transition-colors hover:border-purple-400 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              <Icon name="message-circle" className="h-3.5 w-3.5" />
              {t("HOME.CODE.NO_CODE_CHAT_LINK")}
            </Link>
          </div>
        </div>

        <div className="relative flex-1 pt-8 lg:pt-0">
          <CodeBlock
            language="bash"
            code={`curl -X POST ${env.apiUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d {
    "model": "${docs.modelFor("Anthropic")}",
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
