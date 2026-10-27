"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function ConsentsCard() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("FREE_CONSENT.SETTINGS_TITLE")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          href="/consents"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          {t("FREE_CONSENT.MANAGE")}
        </Link>
      </CardContent>
    </Card>
  );
}
