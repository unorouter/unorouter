"use client";

import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { joinAlpha, normHex, splitAlpha } from "@/lib/theme/palette";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const COMMIT_DELAY_MS = 100;

// `expandShort` is off while typing: "#ff0" on the way to "#ff0000" is a PREFIX, not a
// shorthand, and expanding it committed #ffff00 mid-keystroke. The parent then echoed that
// back into the field, so the text changed under the cursor and the theme flashed a colour
// the user never chose. Shorthand still expands on blur, where the input really is complete.
function normalizeHex(v: string, expandShort = true): string | null {
  let s = v.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (HEX_RE.test(s)) return normHex(s);
  if (expandShort && /^#[0-9a-fA-F]{3,4}$/.test(s)) return normHex(s);
  return expandShort ? cssColorToHex(v.trim()) : null;
}

// "red" and "rgb(255 0 0)" are what people type; without this the field just
// emptied itself on blur and read as broken. The browser does the parsing, but
// an invalid value leaves the PREVIOUS fillStyle in place rather than
// reporting failure, so the probe runs twice from different sentinels: a value
// the browser refused keeps both, a real colour makes them agree.
function cssColorToHex(input: string): string | null {
  // currentColor resolves against the canvas rather than the field, so it
  // would silently mean black.
  if (
    typeof document === "undefined" ||
    !/^[a-z0-9(),.%/\s-]+$/i.test(input) ||
    /^currentcolor$/i.test(input)
  ) {
    return null;
  }
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  const read = (sentinel: string): string => {
    ctx.fillStyle = sentinel;
    ctx.fillStyle = input;
    return typeof ctx.fillStyle === "string" ? ctx.fillStyle.toLowerCase() : "";
  };
  const first = read("#000000");
  if (first !== read("#ffffff")) return null;
  return HEX_RE.test(first) ? normHex(first) : null;
}

export function ColorField(props: {
  label: string;
  value: string | undefined;
  // The value in force when this field is unset, shown greyed in its place.
  placeholder?: string;
  onChange: (next: string | undefined) => void;
}) {
  const t = useTranslations();
  const clipboard = useCopyToClipboard();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [local, setLocal] = useState(props.value ?? "");
  const [prevValue, setPrevValue] = useState(props.value);
  if (props.value !== prevValue) {
    setPrevValue(props.value);
    setLocal(props.value ?? "");
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const debouncedChange = (next: string | undefined) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => props.onChange(next), COMMIT_DELAY_MS);
  };

  const valid = HEX_RE.test(local);
  const { rgb, alpha } = valid
    ? splitAlpha(local)
    : { rgb: "#000000", alpha: 1 };

  return (
    <div className="ring-foreground/10 hover:bg-muted relative flex w-full shrink-0 flex-col gap-1.5 rounded-lg px-3 py-2 ring-1 select-none">
      <div className="flex items-center gap-2">
        {/* The native picker only opens on a real click, so the input sits
            over the swatch instead of being clicked for it. */}
        <span
          className="ring-foreground/15 relative size-6 shrink-0 overflow-hidden rounded-full ring-1"
          style={{
            backgroundColor: local || props.placeholder || "transparent",
          }}
        >
          <input
            type="color"
            value={rgb}
            onChange={(e) => {
              const hex = joinAlpha(e.target.value.toLowerCase(), alpha);
              setLocal(hex);
              debouncedChange(hex);
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={`${props.label} swatch`}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col justify-start">
          <div className="text-muted-foreground text-xs">{props.label}</div>
          <input
            type="text"
            value={local}
            placeholder={props.placeholder ?? "#rrggbb"}
            onChange={(e) => {
              const raw = e.target.value;
              setLocal(raw);
              if (raw === "") return debouncedChange(undefined);
              const hex = normalizeHex(raw, false);
              if (hex) debouncedChange(hex); // valid hex commits; blur normalizes the rest
            }}
            onBlur={(e) => {
              const hex = normalizeHex(e.target.value);
              setLocal(hex ?? "");
              props.onChange(hex ?? undefined);
            }}
            className="text-foreground bg-transparent text-sm font-medium outline-none"
            spellCheck={false}
            aria-label={props.label}
          />
        </div>
        {valid && (
          <button
            type="button"
            onClick={() =>
              void clipboard.copy(local, {
                withToast: t("THEME.COPY_HEX_DONE"),
              })
            }
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("THEME.COPY_HEX")}
          >
            <Icon name="copy" className="size-3.5" />
          </button>
        )}
        {local && (
          <button
            type="button"
            onClick={() => {
              setLocal("");
              props.onChange(undefined);
            }}
            className="text-muted-foreground hover:text-foreground text-xs"
            aria-label="reset"
          >
            ×
          </button>
        )}
      </div>
      {valid && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 text-[11px]">
            {t("THEME.OPACITY")}
          </span>
          <Slider
            aria-label={`${props.label} ${t("THEME.OPACITY")}`}
            min={0}
            max={1}
            step={0.05}
            value={alpha}
            onValueChange={(v) => {
              const hex = joinAlpha(rgb, Array.isArray(v) ? (v[0] ?? 1) : v);
              setLocal(hex);
              debouncedChange(hex);
            }}
          />
          <span className="text-muted-foreground w-9 shrink-0 text-right font-mono text-[11px] tabular-nums">
            {Math.round(alpha * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
