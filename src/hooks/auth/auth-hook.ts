"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type AuthLogin = typeof rpc.api.auth.account.login;

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => {
      return handleElysia(await rpc.api.auth.account.self.get());
    },
    enabled: false,
  });
}

export function useLoginMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.login, "post">,
    ) => {
      return handleElysia(await rpc.api.auth.account.login.post(args.body));
    },
    onError: (e) => handleError(e, t),
  });
}

export function useVerify2FAMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<AuthLogin["2fa"], "post">) => {
      return handleElysia(
        await rpc.api.auth.account.login["2fa"].post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useRegisterMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.register, "post">,
    ) => {
      return handleElysia(await rpc.api.auth.account.register.post(args.body));
    },
    onError: (e) => handleError(e, t),
  });
}

export function useSendVerificationMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.verification, "get">,
    ) => {
      return handleElysia(
        await rpc.api.auth.account.verification.get({ query: args.query }),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useLogoutMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.auth.account.logout.get());
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => queryClient.setQueryData(queryKeys.auth(), null),
  });
}
