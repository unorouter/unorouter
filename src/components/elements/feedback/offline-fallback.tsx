"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";

export function OfflineFallback() {
  const t = useTranslations();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Icon name="wifi-off" className="text-muted-foreground h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t("MAIN.OFFLINE.TITLE")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            {t("MAIN.OFFLINE.DESCRIPTION")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <Icon name="refresh-cw" className="h-4 w-4" />
              {t("MAIN.ACTIONS.TRY_AGAIN")}
            </Button>
            {/* A plain element by id: the inline script on the offline page
                wires it, so it works while no chunk can load and React never
                hydrates. Not a <Button>, whose handler would need React. */}
            <button
              id="uno-repair"
              type="button"
              className="border-input bg-background hover:bg-accent inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium"
            >
              {t("MAIN.ACTIONS.REPAIR")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
