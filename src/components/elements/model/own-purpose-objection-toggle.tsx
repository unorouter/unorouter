"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useOwnPurposeObjectionQuery,
  useSetOwnPurposeObjectionMutation,
} from "@/hooks/auth/own-purpose-objection-hook";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function OwnPurposeObjectionToggle() {
  const t = useTranslations();
  const objectionQuery = useOwnPurposeObjectionQuery();
  const setMutation = useSetOwnPurposeObjectionMutation();
  const objects = objectionQuery.data?.objection ?? false;

  function change(objection: boolean) {
    setMutation.mutate(
      { body: { objection } },
      {
        onSuccess: () =>
          toast.success(
            t(objection ? "OWN_PURPOSE.SAVED" : "OWN_PURPOSE.WITHDRAWN"),
          ),
      },
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">{t("OWN_PURPOSE.DESC")}</p>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="own-purpose-objection" className="text-sm">
          {t("OWN_PURPOSE.LABEL")}
        </Label>
        <Switch
          id="own-purpose-objection"
          checked={objects}
          onCheckedChange={change}
          disabled={!objectionQuery.isSuccess || setMutation.isPending}
        />
      </div>
    </div>
  );
}
