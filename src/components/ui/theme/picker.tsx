"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PickerOption = {
  value: string;
  label: string;
  /** Optional hex string for the indicator swatch in the dropdown list. */
  swatch?: string;
};

type Props = {
  label: string;
  /** Currently selected value. */
  value: string | undefined;
  /** Human label shown on the closed tile next to the picker's `label`. */
  valueLabel: string;
  options: PickerOption[];
  onValueChange: (value: string) => void;
  /** Right-side adornment on the closed tile (swatch chip / radius glyph / etc). */
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
        // `side="left"` shoved the menu off the left screen edge inside the
        // right-anchored theme sheet on mobile. Open downward and let Radix's
        // default collision detection flip it to whatever fits.
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
              <span className="truncate">{opt.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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

export function RadiusGlyph(props: { radius: number }) {
  // Rounded-corner preview. Reused from shadcn-create's right-side glyph.
  const r = Math.max(0, Math.min(20, props.radius * 12));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className="text-foreground"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d={`M4 20v-${10 - Math.round(r / 4)}C4 ${10 - Math.round(r / 4)} ${
          10 - Math.round(r / 4)
        } 4 ${20 - Math.round(r / 4)} 4h${4 + Math.round(r / 4)}`}
      />
    </svg>
  );
}

export function FontGlyph() {
  return (
    <span className="text-foreground text-base leading-none font-semibold">
      Aa
    </span>
  );
}
