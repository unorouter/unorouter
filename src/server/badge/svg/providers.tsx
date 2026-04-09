/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { readFileSync } from "fs";
import type { Locale } from "next-intl";
import { join } from "path";
import { t } from "../i18n";
import {
  renderBadge,
  themeVars,
  type Theme,
  type ThemeColors,
} from "../satori";
import { BrandName, Card, FONT_SANS, Row } from "./components";

const PROVIDERS = [
  { name: "OpenAI", file: "openai.svg" },
  { name: "Anthropic", file: "anthropic.svg" },
  { name: "Google", file: "google.svg" },
  { name: "Meta", file: "meta.svg" },
  { name: "DeepSeek", file: "deepseek.svg" },
  { name: "Mistral", file: "mistral.svg" },
  { name: "Cohere", file: "cohere.svg" },
];

const iconCache = new Map<string, string>();

function loadIcon(file: string): string {
  const cached = iconCache.get(file);
  if (cached) return cached;
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "icons", file),
      "utf-8",
    );
    const uri = `data:image/svg+xml;base64,${Buffer.from(raw).toString("base64")}`;
    iconCache.set(file, uri);
    return uri;
  } catch {
    return "";
  }
}

function ProviderIcon(props: { name: string; file: string; c: ThemeColors }) {
  const uri = loadIcon(props.file);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: 64,
      }}
    >
      {uri ? (
        <img src={uri} width={28} height={28} />
      ) : (
        <Row
          style={{
            width: 28,
            height: 28,
            backgroundColor: props.c.border,
            borderRadius: 4,
          }}
        />
      )}
      <span
        style={{ fontFamily: FONT_SANS, fontSize: 8, color: props.c.muted }}
      >
        {props.name}
      </span>
    </div>
  );
}

export async function generateProviders(
  locale: Locale,
  theme: Theme,
): Promise<string> {
  const c = themeVars(theme);
  const W = 420;
  const H = 200;

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: 24,
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 14,
          fontWeight: 600,
          color: c.text,
        }}
      >
        {t(locale, "BADGE.POWERED_BY")} 12+ {t(locale, "BADGE.PROVIDERS")}
      </span>
      <Row style={{ flexWrap: "wrap", gap: 12 }}>
        {PROVIDERS.map((p) => (
          <ProviderIcon key={p.name} name={p.name} file={p.file} c={c} />
        ))}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            width: 64,
          }}
        >
          <Row
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: c.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 12,
                fontWeight: 600,
                color: c.muted,
              }}
            >
              +5
            </span>
          </Row>
          <span style={{ fontFamily: FONT_SANS, fontSize: 8, color: c.muted }}>
            More
          </span>
        </div>
      </Row>
      <Row style={{ alignItems: "center", gap: 8 }}>
        <BrandName c={c} size={12} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: c.muted }}>
          | {t(locale, "BADGE.UNIFIED_INTELLIGENCE")}
        </span>
      </Row>
    </Card>
  );

  return renderBadge(node, W, H);
}
