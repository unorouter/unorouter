"use client";

import { useRef } from "react";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeHex(v: string): string | null {
  let s = v.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return HEX_RE.test(s) ? s.toLowerCase() : null;
}

export function ColorField(props: {
  label: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const value = props.value ?? "";
  return (
    <div className="ring-foreground/10 hover:bg-muted relative flex w-full shrink-0 items-center gap-2 rounded-lg px-3 py-2 ring-1 select-none">
      <button
        type="button"
        onClick={() => colorInputRef.current?.click()}
        className="ring-foreground/15 size-6 shrink-0 cursor-pointer rounded-full ring-1"
        style={{ backgroundColor: value || "transparent" }}
        aria-label={`${props.label} swatch`}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={value || "#000000"}
        onChange={(e) => props.onChange(e.target.value.toLowerCase())}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col justify-start">
        <div className="text-muted-foreground text-xs">{props.label}</div>
        <input
          type="text"
          value={value}
          placeholder="#rrggbb"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return props.onChange(undefined);
            const hex = normalizeHex(raw);
            if (hex) props.onChange(hex);
            else props.onChange(raw); // let user keep typing; validates on blur
          }}
          onBlur={(e) => {
            const hex = normalizeHex(e.target.value);
            props.onChange(hex ?? undefined);
          }}
          className="text-foreground bg-transparent text-sm font-medium outline-none"
          spellCheck={false}
          aria-label={props.label}
        />
      </div>
      {props.value && (
        <button
          type="button"
          onClick={() => props.onChange(undefined)}
          className="text-muted-foreground hover:text-foreground text-xs"
          aria-label="reset"
        >
          ×
        </button>
      )}
    </div>
  );
}
