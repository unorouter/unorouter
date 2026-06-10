import { prefetchElysia } from "@/lib/react-query/prefetch";
import { SettingsPage } from "@/components/pages/sidebar/settings/settings-page";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function SettingsPageRoute() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.twoFAStatus(), () =>
      rpc.api.auth.settings["2fa"].status.get(cookieHeaders),
    ),
    prefetchElysia(queryClient, queryKeys.passkeyStatus(), () =>
      rpc.api.auth.settings.passkey.get(cookieHeaders),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsPage />
    </HydrationBoundary>
  );
}
