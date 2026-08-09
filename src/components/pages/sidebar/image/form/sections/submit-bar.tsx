"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { estimateImageCost, willClamp } from "@/lib/ai/image/cost-estimate";
import { COST_FLOOR_FALLBACK, COST_MARKUP } from "@/lib/ai/image/constants";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useFormContext, useWatch } from "react-hook-form";
import { clampVariants } from "../../image-constants";
import { useImageNav } from "../../image-nav";

type Props = {
  descriptor: ImageModelDescriptor;
  isPending: boolean;
};

/**
 * Sticky submit area (the result mounting above pushes it below the fold mid-run).
 * Subscribes to the prompt/params it prices itself, so typing re-renders this bar and
 * not the whole form.
 */
export function SubmitBar(props: Props) {
  const t = useTranslations();
  const nav = useImageNav();
  const form = useFormContext<ImageFormValues>();

  const prompt = useWatch({ control: form.control, name: "prompt" }) ?? "";
  const inpaintPrompt = useWatch({
    control: form.control,
    name: "ui.inpaintPrompt",
  });
  const variants = clampVariants(
    useWatch({ control: form.control, name: "ui.variants" }),
  );
  const width =
    useWatch({ control: form.control, name: "params.width" }) ?? 1024;
  const height =
    useWatch({ control: form.control, name: "params.height" }) ?? 1024;
  const steps = useWatch({ control: form.control, name: "params.steps" }) ?? 0;

  const cost = estimateImageCost({
    width,
    height,
    count: variants,
    markup: COST_MARKUP,
    floorPrice: props.descriptor.pricePerCall || COST_FLOOR_FALLBACK,
  });
  const priceLabel = props.descriptor.isFree
    ? t("IMAGE.FREE_BADGE")
    : `~${renderQuota(dollarsToQuota(cost.estimate), 2)}`;
  const clampWarning = willClamp(width, height, steps);

  return (
    <div className="bg-background sticky bottom-0 z-10 flex flex-col gap-2 py-2">
      <Button
        type="submit"
        // Inpainting has its own prompt; either one describes what to generate.
        disabled={props.isPending || !(prompt || inpaintPrompt)}
        size="lg"
      >
        <Icon
          name={props.isPending ? "loader" : "sparkles"}
          className={cn("mr-2", props.isPending && "animate-spin")}
        />
        {props.isPending
          ? t("IMAGE.SUBMITTING")
          : `${t("IMAGE.SUBMIT")} ${priceLabel}`}
      </Button>
      {/* A disabled button with no stated reason reads as broken. */}
      {!props.isPending && !prompt && (
        <p className="text-muted-foreground text-xs">
          {t("IMAGE.SUBMIT_NEEDS_PROMPT")}
        </p>
      )}
      {clampWarning && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t("IMAGE.CLAMP_WARNING")}
        </p>
      )}
      {nav.sessionId && (
        <Link
          href="/image"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("IMAGE.NEW_SESSION")}
        </Link>
      )}
    </div>
  );
}
