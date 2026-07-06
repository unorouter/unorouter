"use client";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function NotFoundCard(props: { fullScreen?: boolean }) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "bg-background flex items-center justify-center p-4",
        props.fullScreen ? "min-h-screen" : "flex-1 py-24",
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Icon
              name="file-question"
              className="text-muted-foreground h-6 w-6"
            />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t("MAIN.NOT_FOUND.TITLE")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            {t("MAIN.NOT_FOUND.DESCRIPTION")}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              {t("MAIN.NOT_FOUND.GO_HOME")}
            </Link>
            <Link href="/models" className={buttonVariants({})}>
              {t("NAV.MODELS")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
