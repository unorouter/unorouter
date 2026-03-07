"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { LuFileQuestion } from "react-icons/lu";

export default function NotFoundPage() {
  const t = useTranslations();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <LuFileQuestion className="text-muted-foreground h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t("MAIN.NOT_FOUND.TITLE")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            {t("MAIN.NOT_FOUND.DESCRIPTION")}
          </p>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2"
          >
            {t("MAIN.NOT_FOUND.GO_HOME")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
