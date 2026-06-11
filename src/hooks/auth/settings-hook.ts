"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type {
  PasskeyStatusData,
  TwoFAStatusData,
  UserSelfData,
} from "@/openapi";
import { useMutation } from "@tanstack/react-query";

type TwoFA = (typeof rpc.api.auth.settings)["2fa"];

export function use2FAStatusQuery() {
  return useElysiaQuery(queryKeys.twoFAStatus(), () =>
    rpc.api.auth.settings["2fa"].status.get(),
  );
}

export function usePasskeyStatusQuery() {
  return useElysiaQuery(queryKeys.passkeyStatus(), () =>
    rpc.api.auth.settings.passkey.get(),
  );
}

export function useGenerateAccessTokenMutation() {
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.settings.token.get()),
  });
}

export function useBindEmailMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.email.bind, "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.settings.email.bind.get({ query: args.query }),
      ),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, email: args.query.email } : old,
      );
    },
  });
}

type OAuthBindingField = "github_id" | "discord_id";

const oauthBindingFieldMap: Record<string, OAuthBindingField> = {
  github: "github_id",
  discord: "discord_id",
};

export function useUnbindOAuthMutation() {
  return useApiMutation({
    mutationFn: async (args: { bindingType: "github" | "discord" }) =>
      handleElysia(
        await rpc.api.auth.account
          .bindings({ binding_type: args.bindingType })
          .delete(),
      ),
    onSuccess: (_, args, qc) => {
      const field = oauthBindingFieldMap[args.bindingType];
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, [field]: "" } : old,
      );
    },
  });
}

export function useUpdateSelfMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.self, "put">,
    ) => handleElysia(await rpc.api.auth.settings.self.put(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
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
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.settings.self.delete()),
  });
}

export function useUpdateSettingMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.setting, "post">,
    ) => handleElysia(await rpc.api.auth.settings.setting.post(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, ...args.body } : old,
      );
    },
  });
}

export function useSendSettingsVerificationMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.verification, "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.settings.verification.get({ query: args.query }),
      ),
  });
}

export function useSetup2FAMutation() {
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.settings["2fa"].setup.post()),
  });
}

export function useEnable2FAMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<TwoFA["enable"], "post">) =>
      handleElysia(await rpc.api.auth.settings["2fa"].enable.post(args.body)),
    onSuccess: (_data, _args, qc) => {
      qc.setQueryData<TwoFAStatusData>(queryKeys.twoFAStatus(), (old) =>
        old ? { ...old, enabled: true } : old,
      );
    },
  });
}

export function useDisable2FAMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<TwoFA["disable"], "post">) =>
      handleElysia(await rpc.api.auth.settings["2fa"].disable.post(args.body)),
    onSuccess: (_data, _args, qc) => {
      qc.setQueryData<TwoFAStatusData>(queryKeys.twoFAStatus(), (old) =>
        old ? { ...old, enabled: false } : old,
      );
    },
  });
}

export function usePasskeyRegisterBeginMutation() {
  // No error toast by design: WebAuthn cancel is a normal user action.
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.settings.passkey.register.begin.post()),
  });
}

export function usePasskeyRegisterFinishMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<
        typeof rpc.api.auth.settings.passkey.register.finish,
        "post"
      >,
    ) =>
      handleElysia(
        await rpc.api.auth.settings.passkey.register.finish.post(args.body),
      ),
    onSuccess: (_data, _args, qc) => {
      qc.setQueryData<PasskeyStatusData>(queryKeys.passkeyStatus(), (old) =>
        old ? { ...old, enabled: true } : old,
      );
    },
  });
}

export function usePasskeyDeleteMutation() {
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.settings.passkey.delete()),
    onSuccess: (_data, _args, qc) => {
      qc.setQueryData<PasskeyStatusData>(queryKeys.passkeyStatus(), (old) =>
        old ? { ...old, enabled: false } : old,
      );
    },
  });
}
