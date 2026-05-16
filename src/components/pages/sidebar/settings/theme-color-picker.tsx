"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { LuRefreshCcw } from "react-icons/lu";
import { HexColorPicker } from "react-colorful";

type Props = {
  label: string;
  /** Current value, possibly undefined when user hasn't overridden. */
  value: string | undefined;
  /** Project default shown as the swatch background when value is unset. */
  fallback: string;
  onChange: (next: string | undefined) => void;
};

/**
 * Single color cell: label + swatch popover with HEX picker + manual input
 * + reset button. `undefined` value means "use project default".
 */
export function ThemeColorPicker(props: Props) {
  const t = useTranslations();
  const display = props.value ?? props.fallback;
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-foreground text-sm">{props.label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "border-border h-7 w-7 rounded border shadow-sm",
                  "transition hover:scale-105",
                )}
                style={{ background: display }}
                aria-label={props.label}
              />
            }
          />
          <PopoverContent className="w-56 p-3">
            <HexColorPicker
              color={display}
              onChange={(c) => props.onChange(c)}
            />
            <Input
              value={props.value ?? ""}
              placeholder={props.fallback}
              onChange={(e) => props.onChange(e.target.value || undefined)}
              className="mt-3 font-mono text-xs"
            />
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => props.onChange(undefined)}
          aria-label={t("THEME.RESET_FIELD")}
          disabled={props.value == null}
        >
          <LuRefreshCcw className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
