"use client";

import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function CallbackPage() {
  const t = useTranslations();
  const router = useRouter();
  const authQuery = useAuthQuery();

  useEffect(() => {
    if (authQuery.data) {
      router.push("/");
    } else if (authQuery.isError || (authQuery.isFetched && !authQuery.data)) {
      router.push("/login");
    }
  }, [authQuery.data, authQuery.isError, authQuery.isFetched, router]);

  return (
    <GlassAuthCard>
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="border-foreground/20 border-t-foreground h-8 w-8 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground text-sm">
          {t("AUTH.CALLBACK_LOADING")}
        </p>
      </div>
    </GlassAuthCard>
  );
}
