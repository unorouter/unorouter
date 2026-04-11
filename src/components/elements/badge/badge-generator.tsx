/* eslint-disable @next/next/no-img-element */
"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import {
  BADGE_SIZES,
  BADGE_TYPES,
  FORMATS,
  THEMES,
  type BadgeFormat,
  type BadgeSize,
  type BadgeType,
  type Theme,
} from "@/lib/validation/badge";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ShikiHighlighter from "react-shiki";

type BadgeGeneratorProps = {
  defaultType?: BadgeType;
  refCode?: string;
};

export function BadgeGenerator(props: BadgeGeneratorProps) {
  const t = useTranslations();
  const [type, setType] = useState<BadgeType>(props.defaultType ?? "referral");
  const [size, setSize] = useState<BadgeSize>("md");
  const [theme, setTheme] = useState<Theme>("dark");
  const [format, setFormat] = useState<BadgeFormat>("svg");
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>(LOCALES[0]);

  const params = new URLSearchParams();
  params.set("locale", locale);
  params.set("theme", theme);
  params.set("size", size);
  if (format !== "svg") params.set("format", format);
  if (props.refCode) params.set("ref", props.refCode);
  const previewUrl = `/api/badge/${type}?${params.toString()}`;

  const badgeAbsoluteUrl = `${env.appUrl}/api/badge/${type}?${params.toString()}`;
  const linkUrl = props.refCode
    ? `${env.appUrl}/?ref=${props.refCode}`
    : env.appUrl;
  const embedCode = `<a href="${linkUrl}" target="_blank">\n  <img src="${badgeAbsoluteUrl}" alt="${env.appName}" />\n</a>`;

  return (
    <div className="border-border border p-5">
      <span className="text-muted-foreground mb-1 block font-mono text-[10px] font-medium tracking-widest uppercase">
        {t("AFFILIATE.BADGE_GENERATOR.TITLE")}
      </span>
      <p className="text-muted-foreground mb-4 text-xs">
        {t("AFFILIATE.BADGE_GENERATOR.DESCRIPTION")}
      </p>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("AFFILIATE.BADGE_GENERATOR.TYPE")}
          </span>
          <Select value={type} onValueChange={(v) => setType(v as BadgeType)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BADGE_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>
                  {bt.charAt(0).toUpperCase() + bt.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("AFFILIATE.BADGE_GENERATOR.SIZE")}
          </span>
          <div data-slot="button-group" className="flex">
            {BADGE_SIZES.map((s) => (
              <Button
                key={s}
                size="xs"
                variant={s === size ? "secondary" : "outline"}
                onClick={() => setSize(s)}
              >
                {s.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("AFFILIATE.BADGE_GENERATOR.THEME")}
          </span>
          <div data-slot="button-group" className="flex">
            {THEMES.map((th) => (
              <Button
                key={th}
                size="xs"
                variant={th === theme ? "secondary" : "outline"}
                onClick={() => setTheme(th)}
              >
                {t(`THEME.${th.toUpperCase()}` as "THEME.DARK")}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("AFFILIATE.BADGE_GENERATOR.LOCALE")}
          </span>
          <div data-slot="button-group" className="flex">
            {LOCALES.map((l) => (
              <Button
                key={l}
                size="xs"
                variant={l === locale ? "secondary" : "outline"}
                onClick={() => setLocale(l)}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("AFFILIATE.BADGE_GENERATOR.FORMAT")}
          </span>
          <div data-slot="button-group" className="flex">
            {FORMATS.map((f) => (
              <Button
                key={f}
                size="xs"
                variant={f === format ? "secondary" : "outline"}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <span className="text-muted-foreground mb-2 block font-mono text-[10px] tracking-widest uppercase">
          {t("AFFILIATE.BADGE_GENERATOR.PREVIEW")}
        </span>
        <div className="bg-muted/50 border-border relative flex min-h-30 items-center justify-center overflow-hidden rounded-sm border p-6">
          <img
            key={previewUrl}
            src={previewUrl}
            alt={t("AFFILIATE.BADGE_GENERATOR.BADGE_ALT")}
            className="max-w-full"
          />
          <CopyButton
            text={badgeAbsoluteUrl}
            className="text-muted-foreground hover:text-foreground absolute top-2 right-2 transition-colors"
          />
        </div>
      </div>

      {/* Embed Code */}
      <div>
        <span className="text-muted-foreground mb-2 block font-mono text-[10px] tracking-widest uppercase">
          {t("AFFILIATE.BADGE_GENERATOR.EMBED_CODE")}
        </span>
        <div className="bg-card border-border group relative overflow-hidden rounded-sm border">
          <ShikiHighlighter
            language="html"
            theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
            addDefaultStyles={false}
            showLanguage={false}
            defaultColor="light-dark()"
            className="[&_pre]:bg-transparent! [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:break-all [&_pre]:whitespace-pre-wrap"
          >
            {embedCode}
          </ShikiHighlighter>
          <CopyButton
            text={embedCode}
            toastMessage={t("AFFILIATE.BADGE_GENERATOR.COPIED")}
            className="text-muted-foreground hover:text-foreground absolute top-2 right-2 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
