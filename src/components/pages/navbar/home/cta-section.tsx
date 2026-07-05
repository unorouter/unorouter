import { GetStartedLink } from "@/components/elements/brand/get-started-link";
import { Link } from "@/i18n/navigation";

import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function CtaSection() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative border-t py-16 lg:py-32">
      <div className="mx-auto max-w-360 px-6 text-center">
        <div className="space-y-8">
          <h2 className="text-4xl font-bold tracking-tighter md:text-5xl">
            {t("HOME.CTA.TITLE_1")}{" "}
            <span className="text-purple-600 dark:text-purple-400">
              {t("HOME.CTA.TITLE_2")}
            </span>
            ?
          </h2>
          <p className="text-muted-foreground mx-auto max-w-xl font-mono text-sm">
            {t("HOME.CTA.SUBTITLE")}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 font-mono text-xs sm:flex-row">
            <GetStartedLink
              className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-12 w-full items-center justify-center gap-2 px-10 font-bold tracking-widest uppercase transition-colors sm:w-auto"
              translationKey="HOME.CTA.PRIMARY"
            />
            <Link
              href="/chat"
              className="border-border text-foreground hover:border-foreground flex h-12 w-full items-center justify-center gap-2 border bg-transparent px-10 font-bold tracking-widest uppercase transition-all sm:w-auto"
            >
              <Icon name="message-circle" className="h-3.5 w-3.5" />
              {t("HOME.CTA.CHAT")}
            </Link>
            <Link
              href="/docs/integrations"
              className="border-border text-foreground hover:border-foreground group flex h-12 w-full items-center justify-center gap-2 border bg-transparent px-10 font-bold tracking-widest uppercase transition-all sm:w-auto"
            >
              {t("HOME.CTA.SECONDARY")}
              <Icon
                name="chevron-right"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
