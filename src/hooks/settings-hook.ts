"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type {
  ResponseDtoPasskeyStatusDataData,
  ResponseDtoTwoFAStatusDataData,
  ResponseDtoUserSelfDataData,
} from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const twoFA = rpc.api.settings["2fa"];

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
    mutationFn: async (args: EdenArgs<typeof rpc.api.settings.self, "put">) =>
      handleElysia(await rpc.api.settings.self.put(args.body)),
    onSuccess: (_, args) => {
      const body = args.body;
      queryClient.setQueryData<ResponseDtoUserSelfDataData>(
        queryKeys.auth(),
        (old) =>
          old
            ? {
                ...old,
                ...(body?.display_name && {
                  display_name: body.display_name,
                }),
                ...(body?.email && { email: body.email }),
              }
            : old,
      );
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
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.settings.setting, "post">,
    ) => handleElysia(await rpc.api.settings.setting.post(args.body)),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoUserSelfDataData>(
        queryKeys.auth(),
        (old) => (old && args.body ? { ...old, ...args.body } : old),
      );
    },
  });
}

export function useSendSettingsVerificationMutation() {
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.settings.verification, "get">,
    ) =>
      handleElysia(
        await rpc.api.settings.verification.get({ query: args.query }),
      ),
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
    mutationFn: async (args: EdenArgs<(typeof twoFA)["enable"], "post">) =>
      handleElysia(await rpc.api.settings["2fa"].enable.post(args.body)),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoTwoFAStatusDataData>(
        queryKeys.twoFAStatus(),
        (old) => (old ? { ...old, enabled: true } : old),
      );
    },
  });
}

export function useDisable2FAMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<(typeof twoFA)["disable"], "post">) =>
      handleElysia(await rpc.api.settings["2fa"].disable.post(args.body)),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoTwoFAStatusDataData>(
        queryKeys.twoFAStatus(),
        (old) => (old ? { ...old, enabled: false } : old),
      );
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
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.settings.passkey.register.finish, "post">,
    ) =>
      handleElysia(
        await rpc.api.settings.passkey.register.finish.post(args.body),
      ),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoPasskeyStatusDataData>(
        queryKeys.passkeyStatus(),
        (old) => (old ? { ...old, enabled: true } : old),
      );
    },
  });
}

export function usePasskeyDeleteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.settings.passkey.delete()),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoPasskeyStatusDataData>(
        queryKeys.passkeyStatus(),
        (old) => (old ? { ...old, enabled: false } : old),
      );
    },
  });
}
