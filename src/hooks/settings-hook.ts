"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { UpdateUserSettingRequest } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function use2FAStatusQuery() {
  return useQuery({
    queryKey: queryKeys.twoFAStatus(),
    queryFn: async () =>
      handleElysia(await rpc.api.settings["2fa"].status.get()),
  });
}

export function usePasskeyStatusQuery() {
  return useQuery({
    queryKey: queryKeys.passkeyStatus(),
    queryFn: async () => handleElysia(await rpc.api.settings.passkey.get()),
  });
}

export function useGenerateAccessTokenMutation() {
  return useMutation({
    mutationFn: async () => handleElysia(await rpc.api.settings.token.get()),
  });
}

export function useUpdateSelfMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Partial<{
        password: string;
        original_password: string;
        email: string;
        verification_code: string;
        display_name: string;
      }>,
    ) => handleElysia(await rpc.api.settings.self.put(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}

export function useDeleteSelfMutation() {
  return useMutation({
    mutationFn: async () => handleElysia(await rpc.api.settings.self.delete()),
  });
}

export function useUpdateSettingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateUserSettingRequest) =>
      handleElysia(await rpc.api.settings.setting.post(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}

export function useSendSettingsVerificationMutation() {
  return useMutation({
    mutationFn: async (data: { email: string; turnstile?: string }) =>
      handleElysia(await rpc.api.settings.verification.get({ query: data })),
  });
}

export function useSetup2FAMutation() {
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.settings["2fa"].setup.post()),
  });
}

export function useEnable2FAMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      handleElysia(await rpc.api.settings["2fa"].enable.post({ code })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFAStatus() });
    },
  });
}

export function useDisable2FAMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      handleElysia(await rpc.api.settings["2fa"].disable.post({ code })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFAStatus() });
    },
  });
}

export function usePasskeyRegisterBeginMutation() {
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.settings.passkey.register.begin.post()),
  });
}

export function usePasskeyRegisterFinishMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credential: unknown) =>
      handleElysia(
        await rpc.api.settings.passkey.register.finish.post(
          credential as Record<string, unknown>,
        ),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passkeyStatus() });
    },
  });
}

export function usePasskeyDeleteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.settings.passkey.delete()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passkeyStatus() });
    },
  });
}
