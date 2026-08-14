import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { Link } from "@/i18n/navigation";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { redirectFromAuth, serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout(props: Props) {
  await serverLocale(props);
  const t = await getTranslations();
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  if (queryClient.getQueryData(queryKeys.auth())) await redirectFromAuth();

  await prefetchElysia(queryClient, queryKeys.status(), () =>
    rpc.api.auth.account.status.get(),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="from-background via-muted to-background flex min-h-dvh flex-col items-center justify-center bg-linear-to-br px-4 py-12">
        <div className="animate-slide-up mb-8 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <LogoImage width={36} height={36} priority />
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
          {" / "}
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            {t("FOOTER.LEGAL_PRIVACY")}
          </Link>
        </p>
      </main>
    </HydrationBoundary>
  );
}
