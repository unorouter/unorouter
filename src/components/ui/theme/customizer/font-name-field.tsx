"use client";

import { Input } from "@/components/ui/input";
import { normFontFamily } from "@/components/ui/theme/theme-build-css";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Accepts what a user actually has in hand: a family name, or the whole
// fonts.googleapis.com link copied off the Google Fonts page. Only the family
// name is ever stored, so no user-supplied URL reaches the theme.
export function familyFromInput(raw: string): string {
  const text = raw.trim();
  const family = /fonts\.googleapis\.com/i.test(text)
    ? (/[?&]family=([^&:]+)/i.exec(text)?.[1] ?? "")
    : text;
  return decodeURIComponent(family).replace(/[+_]/g, " ").trim();
}

export function FontNameField(props: {
  label: string;
  value: string | undefined;
  onChange: (name: string | undefined) => void;
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
    const name = normFontFamily(familyFromInput(raw));
    setInvalid(!name);
    if (name) props.onChange(name);
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
