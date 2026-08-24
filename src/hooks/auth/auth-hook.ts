"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { UserSelfData } from "@/openapi";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

type AuthLogin = typeof rpc.api.auth.account.login;

// Every route serves auth from a server prefetch, so this only fetches when the
// prefetch reported an expired session.
export function useAuthQuery() {
  const expired = useAuthCache(queryKeys.sessionExpired()) === true;
  return useElysiaQuery(
    queryKeys.auth(),
    () => rpc.api.auth.account.self.get(),
    { enabled: expired },
  );
}

export function useAuthUser() {
  return useAuthCache<UserSelfData>(queryKeys.auth());
}

export function useAuthUserId(): number {
  return Number(useAuthUser()?.id ?? GUEST_USER_ID);
}

export function authUserId(): number {
  return Number(
    getQueryClient().getQueryData<UserSelfData>(queryKeys.auth())?.id ??
      GUEST_USER_ID,
  );
}

// No useQuery: observing a key registers it at render time, and HydrationBoundary
// then hydrates it in an effect instead of during render, so consumers below the
// boundary render logged-out on the server and logged-in on the client (React
// #418). The microtask is because the cache notifies synchronously while
// HydrationBoundary is still rendering. A present-but-null entry is a definite
// guest; an absent one means not-yet-fetched.
function useAuthCache<T>(key: QueryKey): T | undefined {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) =>
      queryClient.getQueryCache().subscribe(() => queueMicrotask(onChange)),
    () => queryClient.getQueryData<T>(key),
    () => undefined,
  );
}

export function useLoginMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.login, "post">,
    ) => handleElysia(await rpc.api.auth.account.login.post(args.body)),
  });
}

export function useVerify2FAMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<AuthLogin["2fa"], "post">) =>
      handleElysia(await rpc.api.auth.account.login["2fa"].post(args.body)),
  });
}

export function useRegisterMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.register, "post">,
    ) => handleElysia(await rpc.api.auth.account.register.post(args.body)),
  });
}

export function useSendVerificationMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.verification, "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.account.verification.get({ query: args.query }),
      ),
  });
}

export function useSendPasswordResetMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<(typeof rpc.api.auth.account)["reset-password"], "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.account["reset-password"].get({ query: args.query }),
      ),
  });
}

export function useResetPasswordMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<
        (typeof rpc.api.auth.account)["reset-password"]["confirm"],
        "post"
      >,
    ) =>
      handleElysia(
        await rpc.api.auth.account["reset-password"].confirm.post(args.body),
      ),
  });
}

export function useLogoutMutation() {
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.account.logout.get()),
    onSuccess: (_data, _vars, qc) => qc.setQueryData(queryKeys.auth(), null),
  });
}
