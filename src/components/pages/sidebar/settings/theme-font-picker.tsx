"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FONT_OPTIONS,
  type FontKind,
  type FontOption,
} from "@/lib/config/theme-fonts";
import { useTranslations } from "next-intl";
import { LuRefreshCcw } from "react-icons/lu";

type Props = {
  label: string;
  kind: FontKind;
  /** Selected font id, or undefined to use the project default. */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
};

const NONE = "__default__";

/**
 * Dropdown of curated fonts filtered by `kind`. Empty selection = fall
 * through to the project default declared in `globals.css`.
 */
export function ThemeFontPicker(props: Props) {
  const t = useTranslations();
  const options: FontOption[] = FONT_OPTIONS.filter((f) =>
    f.kinds.includes(props.kind),
  );
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-foreground text-sm">{props.label}</Label>
      <div className="flex items-center gap-2">
        <Select
          value={props.value ?? NONE}
          onValueChange={(v) =>
            props.onChange(v === NONE || !v ? undefined : v)
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t("THEME.FONT_DEFAULT")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("THEME.FONT_DEFAULT")}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
