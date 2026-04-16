"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { handleError, useSimpleMutation } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type AuthLogin = typeof rpc.api.auth.login;

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => {
      return handleElysia(await rpc.api.auth.self.get());
    },
    enabled: false,
  });
}

export function useLoginMutation() {
  return useSimpleMutation(
    async (args: EdenArgs<typeof rpc.api.auth.login, "post">) => {
      return handleElysia(await rpc.api.auth.login.post(args.body));
    },
  );
}

export function useVerify2FAMutation() {
  return useSimpleMutation(
    async (args: EdenArgs<AuthLogin["2fa"], "post">) => {
      return handleElysia(await rpc.api.auth.login["2fa"].post(args.body));
    },
  );
}

export function useRegisterMutation() {
  return useSimpleMutation(
    async (args: EdenArgs<typeof rpc.api.auth.register, "post">) => {
      return handleElysia(await rpc.api.auth.register.post(args.body));
    },
  );
}

export function useSendVerificationMutation() {
  return useSimpleMutation(
    async (args: EdenArgs<typeof rpc.api.auth.verification, "get">) => {
      return handleElysia(
        await rpc.api.auth.verification.get({ query: args.query }),
      );
    },
  );
}

export function useLogoutMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.auth.logout.get());
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => queryClient.setQueryData(queryKeys.auth(), null),
  });
}
