"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/ui/icon";

export function RpLoginGate() {
  const t = useTranslations();
  return (
    <Card className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center text-sm">
      <p>{t("RP.LOGIN_REQUIRED")}</p>
      <Button nativeButton={false} render={<Link href="/login" />}>
        <Icon name="log-in" className="size-4" />
        {t("RP.LOGIN_CTA")}
      </Button>
    </Card>
  );
}
