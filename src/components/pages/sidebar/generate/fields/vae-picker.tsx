"use client";

// VAE override dropdown. "Automatic" tells the worker to use the
// checkpoint's baked VAE; "None" forces the raw latent decode (rarely
// useful but matches tensor's behavior). Any other value is a filename
// on the RunPod volume's /workspace/models/vae/.
//
// The list is hardcoded to the 10 VAEs known to live on the volume per
// comfyui-runpod-memory.md. Operators add files to the volume + edit
// this list together.

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VAES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "automatic", label: "Automatic" },
  { value: "none", label: "None" },
  {
    value: "vae-ft-mse-840000-ema-pruned.ckpt",
    label: "vae-ft-mse-840000-ema-pruned.ckpt",
  },
  { value: "kl-f8-anime.ckpt", label: "kl-f8-anime.ckpt" },
  { value: "kl-f8-anime2.ckpt", label: "kl-f8-anime2.ckpt" },
  { value: "YOZORA.vae.pt", label: "YOZORA.vae.pt" },
  { value: "orangemix.vae.pt", label: "orangemix.vae.pt" },
  { value: "blessed2.vae.pt", label: "blessed2.vae.pt" },
  { value: "animevae.pt", label: "animevae.pt" },
  { value: "ClearVAE.safetensors", label: "ClearVAE.safetensors" },
];

export function VaePicker(props: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const t = useTranslations();
  const v = props.value ?? "automatic";
  return (
    <div>
      <Label className="mb-1 block">{t("IMAGE.VAE")}</Label>
      <Select
        value={v}
        onValueChange={(next) =>
          props.onChange(next === "automatic" ? undefined : next)
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
