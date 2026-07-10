import { prefetchElysia } from "@/lib/react-query/prefetch";
import { SettingsPage } from "@/components/pages/sidebar/settings/settings-page";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function SettingsPageRoute() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
      rpc.api.auth.account.self.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.twoFAStatus(), (cookies) =>
      rpc.api.auth.settings["2fa"].status.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.passkeyStatus(), (cookies) =>
      rpc.api.auth.settings.passkey.get(cookies),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsPage />
    </HydrationBoundary>
  );
}
