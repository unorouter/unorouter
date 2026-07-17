import { LoginLink } from "@/components/elements/brand/login-link";
import { Icon } from "@/components/ui/icon";
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
      {/* Explicit trigger id: Base UI's useId differs between the streamed
          server render and client hydration across this Suspense hole
          (React #418); a stable id keeps the markup identical. UserDropdown
          renders the plain button until mounted, then swaps in the interactive
          Base UI trigger client-side, so hydration never compares the decorated
          trigger against the streamed static button. */}
      <UserDropdown side="bottom" align="end" triggerId="nav-user-trigger">
        <button className="cursor-pointer focus:outline-none">
          {/* Deliberately NOT <UserAvatar />: its auth-query gate breaks
              hydration inside this streamed hole. A shell component
              (LocalUserIdSync) creates the auth query as pending before this
              boundary renders, and TanStack HydrationBoundary defers EXISTING
              queries to useEffect - which never runs during SSR - so the
              server renders the null branch while the client, whose boundary
              can hydrate first, renders the icon (React #418). This RSC only
              reaches here when logged in, so render the icon directly. */}
          <Icon name="user" className="size-4 shrink-0" />
        </button>
      </UserDropdown>
    </HydrationBoundary>
  );
}

export function NavLoginLink(props: { label: string }) {
  return (
    <LoginLink
      aria-label={props.label}
      className="text-muted-foreground hover:text-foreground text-[11px] font-bold tracking-wider uppercase transition-colors"
    >
      <Icon name="log-in" className="h-5 w-5 sm:hidden" />
      <span className="hidden sm:inline">{props.label}</span>
    </LoginLink>
  );
}
