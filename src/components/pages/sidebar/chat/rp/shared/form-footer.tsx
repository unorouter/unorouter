"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function FormFooter(props: { onCancel: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={props.onCancel}>
        {t("COMMON.CANCEL")}
      </Button>
      <Button type="submit">{t("COMMON.SAVE")}</Button>
    </div>
  );
}
