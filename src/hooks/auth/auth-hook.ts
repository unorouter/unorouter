"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { UserSelfData } from "@/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useSyncExternalStore } from "react";

type AuthLogin = typeof rpc.api.auth.account.login;

// Read-only: every route serves auth from a server prefetch (NavAuth, the
// sidebar layout, chat/docs/status AuthHydration), so this never fetches.
// Login/logout and profile edits write the cache via setQueryData, which is
// what keeps consumers current.
//
// The exception is a session that expired between renders. The prefetch clears
// the dead cookie and seeds sessionExpired(), and enabling on that is what
// makes the client re-check against the cleared jar rather than trust a
// logged-out prefetch it never requested.
export function useAuthQuery() {
  return useElysiaQuery(
    queryKeys.auth(),
    () => rpc.api.auth.account.self.get(),
    { enabled: useSessionExpired() },
  );
}

// Reads the flag WITHOUT a useQuery, for the same reason useAuthUser does:
// observing a key registers it at render time, and HydrationBoundary defers an
// already-registered query to an effect, which is the React #418 mismatch this
// file works around everywhere else. useAuthQuery sits under useApiKey and the
// billing hooks, so it renders above boundaries often enough to hit it.
function useSessionExpired(): boolean {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) =>
      queryClient.getQueryCache().subscribe(() => queueMicrotask(onChange)),
    () => queryClient.getQueryData(queryKeys.sessionExpired()) === true,
    () => false,
  );
}

// Effect-only auth reader for components ABOVE the page's HydrationBoundary.
// A root-level useQuery registers the auth key before the boundary runs, and
// HydrationBoundary hydrates an already-registered query in an effect rather
// than during render, so every consumer below renders logged-out on the
// server and logged-in on the client. Subscribing to the cache instead of
// observing the query keeps the key unregistered at render time.
export function useAuthUser(): {
  user: UserSelfData | undefined;
  loaded: boolean;
} {
  const queryClient = useQueryClient();

  // getSnapshot must be referentially stable across notifications or React
  // loops, so cache the wrapper and rebuild it only when the query state
  // object itself changes.
  const snapshot = useRef<{
    source: unknown;
    value: { user: UserSelfData | undefined; loaded: boolean };
  }>(undefined);

  const getSnapshot = () => {
    const state = queryClient
      .getQueryCache()
      .find({ queryKey: queryKeys.auth() })?.state;
    if (!snapshot.current || snapshot.current.source !== state) {
      snapshot.current = {
        source: state,
        value: {
          user: state?.data as UserSelfData | undefined,
          loaded: state?.status === "success",
        },
      };
    }
    return snapshot.current.value;
  };

  return useSyncExternalStore(
    // The cache notifies synchronously, and HydrationBoundary hydrates during
    // its own render, so a direct onChange would update this component while
    // another one renders. A microtask moves it off that stack.
    (onChange) => {
      const cache = queryClient.getQueryCache();
      return cache.subscribe(() => queueMicrotask(onChange));
    },
    getSnapshot,
    () => EMPTY_AUTH,
  );
}

const EMPTY_AUTH = { user: undefined, loaded: false };

export function useAuthUserId(): number {
  return Number(useAuthUser().user?.id ?? GUEST_USER_ID);
}

// Same source as useAuthUser, for the non-React callers (the chat transport)
// that need the id at send time rather than at render.
export function authUserId(): number {
  const user = getQueryClient().getQueryData(queryKeys.auth()) as
    UserSelfData | undefined;
  return Number(user?.id ?? GUEST_USER_ID);
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
