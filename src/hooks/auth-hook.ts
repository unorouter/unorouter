"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type {
  LoginRequest,
  RegisterRequest,
  Verify2FARequest,
} from "@/openapi";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => handleElysia(await rpc.api.auth.self.get()),
    enabled: false,
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (data: LoginRequest & { turnstile?: string }) =>
      handleElysia(await rpc.api.auth.login.post(data)),
  });
}

export function useVerify2FAMutation() {
  return useMutation({
    mutationFn: async (code: Verify2FARequest["code"]) =>
      handleElysia(await rpc.api.auth.login["2fa"].post({ code })),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (data: RegisterRequest & { turnstile?: string }) =>
      handleElysia(await rpc.api.auth.register.post(data)),
  });
}

export function useSendVerificationMutation() {
  return useMutation({
    mutationFn: async (data: { email: string; turnstile?: string }) =>
      handleElysia(await rpc.api.auth.verification.get({ query: data })),
  });
}

export function useLogoutMutation() {
  const authQuery = useAuthQuery();
  return useMutation({
    mutationFn: async () => handleElysia(await rpc.api.auth.logout.get()),
    onSuccess: () => {
      authQuery.refetch();
    },
  });
}
