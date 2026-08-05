"use client";

import { useEffect, useRef, useState } from "react";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const COMMIT_DELAY_MS = 100;

// `expandShort` is off while typing: "#ff0" on the way to "#ff0000" is a PREFIX, not a
// shorthand, and expanding it committed #ffff00 mid-keystroke. The parent then echoed that
// back into the field, so the text changed under the cursor and the theme flashed a colour
// the user never chose. Shorthand still expands on blur, where the input really is complete.
function normalizeHex(v: string, expandShort = true): string | null {
  let s = v.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (expandShort && /^#[0-9a-fA-F]{3}$/.test(s)) {
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

  return (
    <div className="ring-foreground/10 hover:bg-muted relative flex w-full shrink-0 items-center gap-2 rounded-lg px-3 py-2 ring-1 select-none">
      <button
        type="button"
        onClick={() => colorInputRef.current?.click()}
        className="ring-foreground/15 size-6 shrink-0 cursor-pointer rounded-full ring-1"
        style={{ backgroundColor: local || "transparent" }}
        aria-label={`${props.label} swatch`}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={local || "#000000"}
        onChange={(e) => {
          const hex = e.target.value.toLowerCase();
          setLocal(hex);
          debouncedChange(hex);
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col justify-start">
        <div className="text-muted-foreground text-xs">{props.label}</div>
        <input
          type="text"
          value={local}
          placeholder="#rrggbb"
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
  );
}
