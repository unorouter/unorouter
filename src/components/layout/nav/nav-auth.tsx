import { LoginLink } from "@/components/elements/brand/login-link";
import { Icon } from "@/components/ui/icon";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchAuth, prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export async function NavAuth() {
  const t = await getTranslations();
  const queryClient = getQueryClient();

  await prefetchAuth(queryClient);
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  if (!isLoggedIn) {
    return <NavLoginLink label={t("NAV.LOG_IN")} />;
  }

  await prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
    rpc.api.billing.core["subscription-self"].get(cookies),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* Explicit trigger id: written for a React 18 useId instability that
          19 fixed. Two SSR renders here now emit identical base-ui ids, so
          this is belt-and-braces, not load-bearing. */}
      <UserDropdown side="bottom" align="end" triggerId="nav-user-trigger">
        <button className="cursor-pointer focus:outline-none">
          {/* Deliberately NOT <UserAvatar />: it gates on the auth query, and
              HydrationBoundary defers an already-cached query to useEffect,
              which never runs during SSR, so the two sides can disagree on the
              null branch (React #418). This is also what TanStack advises for
              server components: prefetch there, do not render the query result.
              The RSC above already proved the user is logged in, so the icon
              needs no gate. */}
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
