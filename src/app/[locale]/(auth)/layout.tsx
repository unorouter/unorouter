import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { Link, redirect } from "@/i18n/navigation";
import { Redirect } from "@/i18n/routing";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { serverLocale, setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCookie } from "cookies-next/server";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { ReactNode } from "react";

export default async function AuthLayout(props: { children: ReactNode }) {
  const t = await getTranslations();
  const queryClient = getQueryClient();

  const locale = await serverLocale();
  const self = await rpc.api.auth.self.get(await setCookies());

  if (self?.data?.data?.id) {
    const redirectTo = await getCookie(AUTH_REDIRECT_COOKIE, { cookies });
    redirect({
      href: (redirectTo as Redirect["href"]) || "/dashboard",
      locale,
    });
  }

  await queryClient.prefetchQuery({
    queryKey: queryKeys.status(),
    queryFn: async () => handleElysia(await rpc.api.auth.status.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="from-background via-muted to-background flex min-h-dvh flex-col items-center justify-center bg-linear-to-br px-4 py-12">
        <div className="animate-slide-up mb-8 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <LogoImage width={36} height={36} />
            <CompanyName className="text-foreground font-mono text-xl" />
          </Link>
        </div>

        {props.children}

        <p className="text-muted-foreground animate-fade-in mt-8 text-center text-xs">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            {t("FOOTER.LEGAL_TERMS")}
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            {t("FOOTER.LEGAL_PRIVACY")}
          </Link>
        </p>
      </div>
    </HydrationBoundary>
  );
}
