"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

const login = rpc.api.auth.login;

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => handleElysia(await rpc.api.auth.self.get()),
    enabled: false,
  });
}

export function useLoginMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.auth.login, "post">) =>
      handleElysia(await rpc.api.auth.login.post(args.body)),
    onError: (e) => handleError(e, t),
  });
}

export function useVerify2FAMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<(typeof login)["2fa"], "post">) =>
      handleElysia(await rpc.api.auth.login["2fa"].post(args.body)),
    onError: (e) => handleError(e, t),
  });
}

export function useRegisterMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.auth.register, "post">) =>
      handleElysia(await rpc.api.auth.register.post(args.body)),
    onError: (e) => handleError(e, t),
  });
}

export function useSendVerificationMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.verification, "get">,
    ) =>
      handleElysia(await rpc.api.auth.verification.get({ query: args.query })),
    onError: (e) => handleError(e, t),
  });
}

export function useLogoutMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => handleElysia(await rpc.api.auth.logout.get()),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth(), null);
    },
  });
}
