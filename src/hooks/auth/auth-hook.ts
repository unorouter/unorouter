"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { UserSelfData } from "@/openapi";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

type AuthLogin = typeof rpc.api.auth.account.login;

// Read-only: every route serves auth from a server prefetch (NavAuth, the
// sidebar layout, chat/docs/status AuthHydration), so this fetches only when
// the prefetch reported an expired session. Login/logout and profile edits
// write the cache via setQueryData, which is what keeps consumers current.
export function useAuthQuery() {
  return useElysiaQuery(
    queryKeys.auth(),
    () => rpc.api.auth.account.self.get(),
    {
      enabled: useCached(
        (qc) => qc.getQueryData(queryKeys.sessionExpired()) === true,
        false,
      ),
    },
  );
}

export function useAuthUser(): UserSelfData | undefined {
  return useCached((qc) => qc.getQueryData(queryKeys.auth()), undefined);
}

export function useAuthUserId(): number {
  return Number(useAuthUser()?.id ?? GUEST_USER_ID);
}

// Same source, for the non-React callers (the chat transport) that need the id
// at send time rather than at render.
export function authUserId(): number {
  return Number(
    getQueryClient().getQueryData<UserSelfData>(queryKeys.auth())?.id ??
      GUEST_USER_ID,
  );
}

// Reads the cache WITHOUT a useQuery: observing a key registers it at render
// time, and HydrationBoundary hydrates an already-registered query in an
// effect rather than during render, so every consumer below the boundary
// renders logged-out on the server and logged-in on the client (React #418).
// The cache notifies synchronously while HydrationBoundary is still rendering,
// so the microtask keeps this out of another component's render.
function useCached<T>(read: (qc: QueryClient) => T, server: T): T {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) =>
      queryClient.getQueryCache().subscribe(() => queueMicrotask(onChange)),
    () => read(queryClient),
    () => server,
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
