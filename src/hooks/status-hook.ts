"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export interface StatusData {
  password_login_enabled: boolean;
  password_register_enabled: boolean;
  email_verification: boolean;
  github_oauth: boolean;
  github_client_id: string;
  discord_oauth: boolean;
  discord_client_id: string;
  oidc_enabled: boolean;
  oidc_client_id: string;
  oidc_authorization_endpoint: string;
  linuxdo_oauth: boolean;
  linuxdo_client_id: string;
  telegram_oauth: boolean;
  telegram_bot_name: string;
  wechat_login: boolean;
  turnstile_check: boolean;
  turnstile_site_key: string;
  server_address: string;
  custom_oauth_providers?: Array<{
    id: number;
    name: string;
    slug: string;
    icon: string;
    client_id: string;
    authorization_endpoint: string;
    scopes: string;
  }>;
}

export function useStatusQuery() {
  return useQuery<StatusData | null>({
    queryKey: queryKeys.status(),
    queryFn: async () => {
      const result = handleElysia(
        await rpc.api.auth.status.get(),
      ) as { success: boolean; data: unknown };
      if (!result.success) return null;
      return result.data as StatusData;
    },
    staleTime: 10 * 60 * 1000,
  });
}
