import { BLOG_REGISTRY, DOCS_REGISTRY } from "@/i18n/registry";
import { LOCALES, msg, type TranslationKey } from "@/lib/config/constants";
import type { pathnames } from "@/i18n/routing";
import { create, insert } from "@orama/orama";
import { persist } from "@orama/plugin-data-persistence";
import { error, log } from "console";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type StaticRoute = Exclude<keyof typeof pathnames, `${string}[${string}`>;
type IndexUrl = StaticRoute | `/blog/${string}`;

type IndexPage = {
  url: IndexUrl;
  /** Namespace path (not a leaf translation key), e.g. "DOCS.CLAUDE_CODE". */
  keyPrefix: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  category: "Docs" | "Blog";
};

const DOC_PAGES: IndexPage[] = DOCS_REGISTRY.map((d) => ({
  url: d.path,
  keyPrefix: d.i18nPrefix,
  titleKey: msg(`${d.i18nPrefix}.TITLE`),
  subtitleKey: msg(`${d.i18nPrefix}.SUBTITLE`),
  category: "Docs",
}));

const BLOG_PAGES: IndexPage[] = BLOG_REGISTRY.map((b) => ({
  url: `/blog/${b.slug}`,
  keyPrefix: b.i18nKey,
  titleKey: msg(`${b.i18nKey}.TITLE`),
  subtitleKey: msg(`${b.i18nKey}.DESCRIPTION`),
  category: "Blog",
}));

const PAGES: IndexPage[] = [...DOC_PAGES, ...BLOG_PAGES];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

function collectStrings(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (typeof obj !== "object" || obj === null) return [];
  const results: string[] = [];
  for (const value of Object.values(obj)) {
    results.push(...collectStrings(value));
  }
  return results;
}

function stripPlaceholders(text: string): string {
  return text
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function generateSearchIndex() {
  log("Generating search index...");

  const db = create({
    schema: {
      title: "string",
      content: "string",
      description: "string",
      url: "string",
      category: "enum",
      locale: "enum",
    } as const,
  });

  let totalIndexed = 0;

  for (const locale of LOCALES) {
    log(`Processing locale: ${locale}`);
    const filePath = join(process.cwd(), "public", "i18n", `${locale}.json`);
    const messages = JSON.parse(readFileSync(filePath, "utf-8"));

    for (const page of PAGES) {
      const section = getNestedValue(messages, page.keyPrefix);
      if (!section || typeof section !== "object") {
        error(
          `  Skipping ${page.url}: key prefix "${page.keyPrefix}" not found`,
        );
        continue;
      }

      const title = stripPlaceholders(
        (getNestedValue(messages, page.titleKey) as string) ?? "",
      );
      const subtitle = stripPlaceholders(
        (getNestedValue(messages, page.subtitleKey) as string) ?? "",
      );
      const allStrings = collectStrings(section).map(stripPlaceholders);
      const content = allStrings.join(" ");
      const description =
        subtitle.slice(0, 200) + (subtitle.length > 200 ? "..." : "");

      await insert(db, {
        title,
        content,
        description,
        url: page.url,
        category: page.category,
        locale,
      });
      totalIndexed++;
      log(`  Indexed: ${page.url} (${title})`);
    }
  }

  const persisted = await persist(db, "json");
  writeFileSync(
    join(process.cwd(), "public", "search-index.json"),
    JSON.stringify(persisted),
  );
  log(`Done. Indexed ${totalIndexed} pages across ${LOCALES.length} locales.`);
}

generateSearchIndex().catch(error);
