"use client";

import type { NotifyEvent } from "@/store/notify-store";
import type { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations<never>>;

function fmtRatio(value: number | undefined): string {
  if (value === undefined) return "?";
  return `${Number(value.toPrecision(3))}`;
}

export function notifyEventText(
  t: Translator,
  evt: NotifyEvent,
): { title: string; body: string } {
  const model = evt.data.model;
  const ratio = fmtRatio(evt.data.cheapest_ratio);
  const prevRatio = fmtRatio(evt.data.prev_cheapest_ratio);
  switch (evt.type) {
    case "model_online":
      return {
        title: t("NOTIFY.EVENT.MODEL_ONLINE", { model }),
        body: t("NOTIFY.EVENT.MODEL_ONLINE_BODY", { ratio }),
      };
    case "model_offline":
      return {
        title: t("NOTIFY.EVENT.MODEL_OFFLINE", { model }),
        body: t("NOTIFY.EVENT.MODEL_OFFLINE_BODY"),
      };
    case "model_price_change": {
      const down =
        (evt.data.cheapest_ratio ?? 0) <= (evt.data.prev_cheapest_ratio ?? 0);
      return {
        title: t("NOTIFY.EVENT.PRICE_CHANGE", { model }),
        body: down
          ? t("NOTIFY.EVENT.PRICE_DOWN_BODY", { prevRatio, ratio })
          : t("NOTIFY.EVENT.PRICE_UP_BODY", { prevRatio, ratio }),
      };
    }
    case "model_added":
      return {
        title: t("NOTIFY.EVENT.MODEL_ADDED", { model }),
        body:
          evt.data.free || evt.data.cheapest_ratio === 0
            ? t("NOTIFY.EVENT.MODEL_ADDED_FREE_BODY")
            : t("NOTIFY.EVENT.MODEL_ADDED_BODY", { ratio }),
      };
    case "model_removed":
      return {
        title: t("NOTIFY.EVENT.MODEL_REMOVED", { model }),
        body: t("NOTIFY.EVENT.MODEL_REMOVED_BODY"),
      };
  }
}
