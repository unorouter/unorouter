import { SETUP_GUIDES } from "@/components/pages/docs/setup-guides";
import { COMPARE_PAIRS } from "@/components/pages/navbar/models/compare/compare-pairs";
import { Link } from "@/i18n/navigation";
import type { getVendorTheme } from "@/lib/config/vendor-registry";
import { APP_VALUES } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { modelSlug } from "@/lib/utils/base";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "./shared/section-heading";

const FALLBACK_GUIDES = ["janitor-ai", "sillytavern", "claude-code", "cline"];
const MAX_GUIDES = 6;

const CHIP =
  "hover:bg-muted/50 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors";

// Links from a model page into the curated compare pages and the setup guides,
// which otherwise only the /compare and /docs indexes reach.
export async function ModelCrossLinks(props: {
  modelName: string;
  available: Set<string>;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = await getTranslations();
  const base = props.modelName.replace(/:free$/, "");
  const pairs = COMPARE_PAIRS.filter(
    (pair) =>
      pair.includes(base) && pair.every((name) => props.available.has(name)),
  );
  const recommended = SETUP_GUIDES.filter((g) =>
    g.recommendedModels.some(
      (name) => name === props.modelName || name === base,
    ),
  );
  const guides = [
    ...recommended,
    ...SETUP_GUIDES.filter(
      (g) => FALLBACK_GUIDES.includes(g.slug) && !recommended.includes(g),
    ),
  ].slice(0, MAX_GUIDES);

  return (
    <>
      {pairs.length > 0 && (
        <section className="mt-12">
          <SectionHeading theme={props.theme}>
            {t("MODEL_PAGE.COMPARE_WITH_TITLE", { model: base })}
          </SectionHeading>
          <div className="flex flex-wrap gap-2">
            {pairs.map((pair) => {
              const other = pair[0] === base ? pair[1] : pair[0];
              return (
                <Link
                  key={other}
                  href={{
                    pathname: "/compare/[...slugs]",
                    params: { slugs: pair.map((n) => modelSlug(n)).sort() },
                  }}
                  prefetch={false}
                  className={CHIP}
                >
                  {base} vs {other}
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section className="mt-12">
        <SectionHeading theme={props.theme}>
          {t("MODEL_PAGE.USE_IN_TITLE", { model: base })}
        </SectionHeading>
        <div className="flex flex-wrap gap-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={guide.href}
              prefetch={false}
              className={cn(CHIP, "font-sans")}
            >
              {t(guide.badgeKey)}
            </Link>
          ))}
        </div>
        {base.startsWith("deepseek") && (
          <p className="mt-4 text-sm">
            <Link
              href={{
                pathname: "/blog/[slug]",
                params: { slug: "free-deepseek-api-key" },
              }}
              prefetch={false}
              className="underline underline-offset-4"
            >
              {t("BLOG.POSTS.FREE_DEEPSEEK_API_KEY.TITLE", APP_VALUES)}
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
