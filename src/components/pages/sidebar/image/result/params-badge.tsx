"use client";

import { Badge } from "@/components/ui/badge";
import type { GenerationParams } from "@/lib/validation/playground";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ParamsBadge(props: {
  model: string;
  params: GenerationParams | null;
}) {
  const t = useTranslations();
  const p = props.params;
  return (
    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
      <span>{props.model}</span>
      {p?.steps !== undefined && (
        <span>
          {t("IMAGE.PARAM_STEPS")} {p.steps}
        </span>
      )}
      {p?.cfg !== undefined && (
        <span>
          {t("IMAGE.PARAM_CFG")} {p.cfg}
        </span>
      )}
      {p?.guidance !== undefined && (
        <span>
          {t("IMAGE.PARAM_GUIDANCE")} {p.guidance}
        </span>
      )}
      {p?.seed !== undefined && (
        <span>
          {t("IMAGE.PARAM_SEED")} {p.seed}
        </span>
      )}
    </div>
  );
}

export function RetentionBadge(props: { expiresAt: Date | string | number }) {
  const t = useTranslations();
  const [now] = useState(() => dayjs());
  const daysLeft = dayjs(props.expiresAt).diff(now, "day");
  if (!Number.isFinite(daysLeft) || daysLeft > 7) return null;
  return (
    <Badge variant="outline" className="text-xs">
      {t("IMAGE.EXPIRES_IN_DAYS", { days: Math.max(0, daysLeft) })}
    </Badge>
  );
}
