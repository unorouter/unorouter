import { LOCALES, msg, type TranslationKey } from "@/lib/config/constants";
import { create, insert } from "@orama/orama";
import { persist } from "@orama/plugin-data-persistence";
import { error, log } from "console";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type DocPage = {
  url: string;
  keyPrefix: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
};

const DOC_PAGES: DocPage[] = [
  {
    url: "/docs",
    keyPrefix: "DOCS_INDEX",
    titleKey: msg("DOCS_INDEX.TITLE"),
    subtitleKey: msg("DOCS_INDEX.SUBTITLE"),
  },
  {
    url: "/docs/claude-code",
    keyPrefix: "DOCS.CLAUDE_CODE",
    titleKey: msg("DOCS.CLAUDE_CODE.TITLE"),
    subtitleKey: msg("DOCS.CLAUDE_CODE.SUBTITLE"),
  },
  {
    url: "/docs/codex",
    keyPrefix: "DOCS.CODEX",
    titleKey: msg("DOCS.CODEX.TITLE"),
    subtitleKey: msg("DOCS.CODEX.SUBTITLE"),
  },
  {
    url: "/docs/gemini-cli",
    keyPrefix: "DOCS.GEMINI_CLI",
    titleKey: msg("DOCS.GEMINI_CLI.TITLE"),
    subtitleKey: msg("DOCS.GEMINI_CLI.SUBTITLE"),
  },
  {
    url: "/docs/openclaw",
    keyPrefix: "DOCS.OPENCLAW",
    titleKey: msg("DOCS.OPENCLAW.TITLE"),
    subtitleKey: msg("DOCS.OPENCLAW.SUBTITLE"),
  },
  {
    url: "/docs/cc-switch",
    keyPrefix: "DOCS.CC_SWITCH",
    titleKey: msg("DOCS.CC_SWITCH.TITLE"),
    subtitleKey: msg("DOCS.CC_SWITCH.SUBTITLE"),
  },
];

/** Resolve a dot-separated key path from a nested object */
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

/** Recursively collect all string values from a nested object */
function collectStrings(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (typeof obj !== "object" || obj === null) return [];
  const results: string[] = [];
  for (const value of Object.values(obj)) {
    results.push(...collectStrings(value));
  }
  return results;
}

/** Strip template placeholders like {appName} from text */
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

    for (const page of DOC_PAGES) {
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
        category: "Docs",
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
