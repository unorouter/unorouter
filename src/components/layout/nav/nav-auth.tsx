import { LoginLink } from "@/components/elements/brand/login-link";
import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { dehydrateOnly, prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

// Streams from a Suspense hole inside the otherwise static navbar: the
// cookie read happens per request, the personalized markup and its
// hydration state travel together, so shell components never race the
// auth cache (the source of the earlier hydration mismatches).
export async function NavAuth() {
  const t = await getTranslations();
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  if (!isLoggedIn) {
    return <NavLoginLink label={t("NAV.LOG_IN")} />;
  }

  await prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
    rpc.api.billing.core["subscription-self"].get(cookies),
  );

  return (
    <HydrationBoundary
      state={dehydrateOnly(queryClient, [
        queryKeys.auth(),
        queryKeys.subscriptionSelf(),
      ])}
    >
      <UserDropdown side="bottom" align="end">
        <button className="cursor-pointer focus:outline-none">
          <UserAvatar />
        </button>
      </UserDropdown>
    </HydrationBoundary>
  );
}

export function NavLoginLink(props: { label: string }) {
  return (
    <LoginLink className="text-muted-foreground hover:text-foreground text-[11px] font-bold tracking-wider uppercase transition-colors">
      {props.label}
    </LoginLink>
  );
}
