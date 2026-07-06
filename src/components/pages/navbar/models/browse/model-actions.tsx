"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useRouter } from "@/i18n/navigation";
import type { ProcessedModel } from "@/lib/api/pricing";
import { modelHref } from "@/lib/utils/base";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";

export type ModelPricingLabels = {
  from: string;
  perRequest: string;
  input: string;
  output: string;
  perMillion: string;
  gridPricing: string;
  customBilling: string;
  tiered: string;
};

const ACTION_CLASS =
  "text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center transition-colors";

export function ModelActionIcons(props: {
  model: ProcessedModel;
  iconSize: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const setChatModel = useSetAtom(chatModelAtom);
  const model = props.model;
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<span className="shrink-0" />}>
          <CopyButton
            text={model.name}
            iconSize={props.iconSize}
            className={ACTION_CLASS}
          />
        </TooltipTrigger>
        <TooltipContent>{t("COMMON.COPY_CODE")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          aria-label={t("MODELS.OPEN_IN_CHAT")}
          className={ACTION_CLASS}
          onClick={(e) => {
            e.stopPropagation();
            setChatModel(model.name);
            router.push("/chat");
          }}
        >
          <Icon name="message-square" className={props.iconSize} />
        </TooltipTrigger>
        <TooltipContent>{t("MODELS.OPEN_IN_CHAT")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          aria-label={t("MODELS.VIEW_DETAILS")}
          className={ACTION_CLASS}
          onClick={(e) => e.stopPropagation()}
          render={
            <Link href={modelHref(model.name, model.vendor.name)} />
          }
        >
          <Icon name="external-link" className={props.iconSize} />
        </TooltipTrigger>
        <TooltipContent>{t("MODELS.VIEW_DETAILS")}</TooltipContent>
      </Tooltip>
    </>
  );
}
