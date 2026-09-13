"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type PickerOption = {
  value: string;
  label: string;
  swatch?: string;
  // CSS variable of a self-hosted font; the label renders in it once scrolled
  // into view, so opening the menu does not fetch every font file at once.
  fontVar?: string;
};

type Props = {
  label: string;
  value: string | undefined;
  valueLabel: string;
  options: PickerOption[];
  onValueChange: (value: string) => void;
  rightAdornment?: React.ReactNode;
  disabled?: boolean;
};

export function Picker(props: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={props.disabled}
        className={cn(
          "ring-foreground/10 relative w-full shrink-0 touch-manipulation rounded-lg px-3 py-2 text-left ring-1 select-none",
          "hover:bg-muted focus-visible:ring-foreground/50 focus-visible:outline-none",
          "data-[state=open]:bg-muted disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <div className="flex flex-col justify-start">
          <div className="text-muted-foreground text-xs">{props.label}</div>
          <div className="text-foreground truncate text-sm font-medium">
            {props.valueLabel}
          </div>
        </div>
        {props.rightAdornment && (
          <div className="pointer-events-none absolute top-1/2 right-3 flex size-4 -translate-y-1/2 items-center justify-center select-none">
            {props.rightAdornment}
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="min-w-44"
      >
        <DropdownMenuRadioGroup
          value={props.value ?? ""}
          onValueChange={props.onValueChange}
        >
          {props.options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              {opt.swatch && (
                <span
                  className="ring-foreground/10 size-3.5 shrink-0 rounded-full ring-1"
                  style={{ backgroundColor: opt.swatch }}
                />
              )}
              {opt.fontVar ? (
                <FontPreviewLabel label={opt.label} fontVar={opt.fontVar} />
              ) : (
                <span className="truncate">{opt.label}</span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FontPreviewLabel(props: { label: string; fontVar: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return (
    <span
      ref={ref}
      className="truncate"
      style={visible ? { fontFamily: `var(${props.fontVar})` } : undefined}
    >
      {props.label}
    </span>
  );
}

export function ColorSwatch(props: { value: string }) {
  return (
    <span
      className="ring-foreground/15 size-4 rounded-full ring-1"
      style={{ backgroundColor: props.value }}
    />
  );
}
