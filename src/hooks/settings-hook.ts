"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError, useSimpleMutation } from "@/lib/utils/client";
import type {
  ResponseDtoPasskeyStatusDataData,
  ResponseDtoTwoFAStatusDataData,
  ResponseDtoUserSelfDataData,
} from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

const _twoFA = rpc.api.settings["2fa"];

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
  return useSimpleMutation(async () =>
    handleElysia(await rpc.api.settings.token.get()),
  );
}

export function useBindEmailMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.settings.email.bind, "get">,
    ) =>
      handleElysia(
        await rpc.api.settings.email.bind.get({ query: args.query }),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoUserSelfDataData>(
        queryKeys.auth(),
        (old) => (old ? { ...old, email: args.query.email } : old),
      );
    },
  });
}

export function useUpdateSelfMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.settings.self, "put">) =>
      handleElysia(await rpc.api.settings.self.put(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoUserSelfDataData>(
        queryKeys.auth(),
        (old) =>
          old
            ? {
                ...old,
                ...(args.body.display_name && {
                  display_name: args.body.display_name,
                }),
                ...(args.body.email && { email: args.body.email }),
              }
            : old,
      );
    },
  });
}

export function useDeleteSelfMutation() {
  return useSimpleMutation(async () =>
    handleElysia(await rpc.api.settings.self.delete()),
  );
}

export function useUpdateSettingMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.settings.setting, "post">,
    ) => handleElysia(await rpc.api.settings.setting.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoUserSelfDataData>(
        queryKeys.auth(),
        (old) => (old ? { ...old, ...args.body } : old),
      );
    },
  });
}

export function useSendSettingsVerificationMutation() {
  return useSimpleMutation(
    async (args: EdenArgs<typeof rpc.api.settings.verification, "get">) =>
      handleElysia(
        await rpc.api.settings.verification.get({ query: args.query }),
      ),
  );
}

export function useSetup2FAMutation() {
  return useSimpleMutation(async () =>
    handleElysia(await rpc.api.settings["2fa"].setup.post()),
  );
}

export function useEnable2FAMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<(typeof _twoFA)["enable"], "post">) =>
      handleElysia(await rpc.api.settings["2fa"].enable.post(args.body)),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoTwoFAStatusDataData>(
        queryKeys.twoFAStatus(),
        (old) => (old ? { ...old, enabled: true } : old),
      );
    },
  });
}

export function useDisable2FAMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<(typeof _twoFA)["disable"], "post">) =>
      handleElysia(await rpc.api.settings["2fa"].disable.post(args.body)),
    onError: (e) => handleError(e, t),
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
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.settings.passkey.register.finish, "post">,
    ) =>
      handleElysia(
        await rpc.api.settings.passkey.register.finish.post(args.body),
      ),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoPasskeyStatusDataData>(
        queryKeys.passkeyStatus(),
        (old) => (old ? { ...old, enabled: true } : old),
      );
    },
  });
}

export function usePasskeyDeleteMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.settings.passkey.delete()),
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<ResponseDtoPasskeyStatusDataData>(
        queryKeys.passkeyStatus(),
        (old) => (old ? { ...old, enabled: false } : old),
      );
    },
  });
}
