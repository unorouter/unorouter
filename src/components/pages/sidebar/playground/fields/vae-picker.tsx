"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VAES } from "../playground-constants";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
};

export function VaePicker(props: Props) {
  const t = useTranslations();
  const v = props.value ?? "automatic";
  return (
    <div>
      <Label className="mb-1 block">{t("IMAGE.VAE")}</Label>
      <Select
        value={v}
        onValueChange={(next) =>
          props.onChange(!next || next === "automatic" ? undefined : next)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VAES.map((vae) => (
            <SelectItem key={vae.value} value={vae.value}>
              {vae.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
