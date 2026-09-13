"use client";

import { Input } from "@/components/ui/input";
import { normFontFamily } from "@/lib/theme/build-css";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type PastedFont = { family: string; weight?: number };

const WEIGHT_MIN = 400;
const WEIGHT_MAX = 700;

function weightFromSpec(spec: string): number | undefined {
  // `wght@700`, `wght@400;700`, and the italic form `ital,wght@0,400;1,700`
  // where each tuple's LAST number is the weight.
  const axis = /wght@([0-9,;]+)/i.exec(spec)?.[1];
  if (!axis) return undefined;
  const weights = new Set<number>();
  for (const tuple of axis.split(";")) {
    const last = tuple.split(",").at(-1);
    const n = Number(last);
    if (Number.isFinite(n) && n >= 100) weights.add(n);
  }
  // Several weights means the user wanted a RANGE, not heavier body text:
  // picking 400 and 700 in Google is "regular, with bold available".
  if (weights.size !== 1) return undefined;
  const only = [...weights][0];
  if (only === undefined || only === WEIGHT_MIN) return undefined;
  const stepped = Math.round(Math.min(WEIGHT_MAX, only) / 100) * 100;
  return stepped === WEIGHT_MIN ? undefined : stepped;
}

// Accepts what a user actually has in hand: a family name, or the whole
// fonts.googleapis.com embed copied off the Google Fonts page. Only the family
// name is ever stored, so no user-supplied URL reaches the theme.
export function parseFontInput(raw: string): PastedFont {
  const text = raw.trim();
  if (!/fonts\.googleapis\.com/i.test(text)) return { family: text };
  const value = /[?&]family=([^&"'\s>]+)/i.exec(text)?.[1] ?? "";
  const [name, ...rest] = value.split(":");
  const family = decodeURIComponent(name ?? "")
    .replace(/[+_]/g, " ")
    .trim();
  const weight = rest.length ? weightFromSpec(rest.join(":")) : undefined;
  return weight === undefined ? { family } : { family, weight };
}

export function FontNameField(props: {
  label: string;
  value: string | undefined;
  onChange: (name: string | undefined, weight?: number) => void;
}) {
  const t = useTranslations();
  const [invalid, setInvalid] = useState(false);

  // Uncontrolled, keyed on the stored name: typing stays local, and an external
  // change (theme import, undo) remounts the input with the new value.
  const commit = (raw: string) => {
    if (!raw.trim()) {
      setInvalid(false);
      props.onChange(undefined);
      return;
    }
    const parsed = parseFontInput(raw);
    const name = normFontFamily(parsed.family);
    setInvalid(!name);
    if (name) props.onChange(name, parsed.weight);
  };

  return (
    <div className="col-span-2 flex flex-col gap-1">
      <Input
        key={props.value ?? ""}
        defaultValue={props.value ?? ""}
        placeholder={t("THEME.FONT_CUSTOM_PLACEHOLDER")}
        aria-label={props.label}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          commit(e.currentTarget.value);
        }}
        className="h-8 text-xs"
      />
      <span
        className={
          invalid ? "text-destructive text-xs" : "text-muted-foreground text-xs"
        }
      >
        {invalid ? t("THEME.FONT_CUSTOM_INVALID") : t("THEME.FONT_CUSTOM_HINT")}
      </span>
    </div>
  );
}
