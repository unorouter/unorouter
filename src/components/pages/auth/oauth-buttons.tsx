"use client";

import { Icon } from "@/components/ui/icon";
import { analytics } from "@/lib/analytics";
import { AFF_CODE_KEY } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { StatusData } from "@/openapi";
import { getCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

type OAuthButtonsProps = {
  status: StatusData;
};

type OAuthProvider = {
  key: string;
  label: string;
  icon: React.ReactNode;
  buildUrl: (state: string, redirectUri: string) => string;
};

function buildBuiltinUrl(
  provider: "github" | "discord" | "oidc" | "linuxdo",
  status: StatusData,
  state: string,
  redirectUri: string,
): string {
  const encodedRedirect = encodeURIComponent(redirectUri);
  switch (provider) {
    case "github":
      return `https://github.com/login/oauth/authorize?client_id=${status.github_client_id}&state=${state}&scope=user:email&redirect_uri=${encodedRedirect}`;
    case "discord":
      return `https://discord.com/api/oauth2/authorize?client_id=${status.discord_client_id}&state=${state}&response_type=code&scope=identify+email&redirect_uri=${encodedRedirect}`;
    case "oidc":
      return `${status.oidc_authorization_endpoint}?client_id=${status.oidc_client_id}&state=${state}&response_type=code&scope=openid+profile+email&redirect_uri=${encodedRedirect}`;
    case "linuxdo":
      return `https://connect.linux.do/oauth2/authorize?client_id=${status.linuxdo_client_id}&state=${state}&response_type=code&redirect_uri=${encodedRedirect}`;
  }
}

export function buildOAuthUrl(
  provider: string,
  status: StatusData,
  state: string,
): string | null {
  const serverAddress = status.server_address || env.apiUrl;
  const redirectUri = `${serverAddress}/api/oauth/${provider}`;
  if (
    provider === "github" ||
    provider === "discord" ||
    provider === "oidc" ||
    provider === "linuxdo"
  ) {
    return buildBuiltinUrl(provider, status, state, redirectUri);
  }
  return null;
}

export function OAuthButtons(props: OAuthButtonsProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState<string | null>(null);

  const serverAddress = props.status.server_address || env.apiUrl;
  const providers: OAuthProvider[] = [];

  if (props.status.github_oauth) {
    providers.push({
      key: "github",
      label: t("AUTH.OAUTH.GITHUB"),
      icon: <Icon name="brand-github" className="h-4 w-4" />,
      buildUrl: (state, redirectUri) =>
        buildBuiltinUrl("github", props.status, state, redirectUri),
    });
  }
  if (props.status.discord_oauth) {
    providers.push({
      key: "discord",
      label: t("AUTH.OAUTH.DISCORD"),
      icon: <Icon name="brand-discord" className="h-4 w-4" />,
      buildUrl: (state, redirectUri) =>
        buildBuiltinUrl("discord", props.status, state, redirectUri),
    });
  }
  if (props.status.oidc_enabled) {
    providers.push({
      key: "oidc",
      label: t("AUTH.OAUTH.OIDC"),
      icon: <Icon name="log-in" className="h-4 w-4" />,
      buildUrl: (state, redirectUri) =>
        buildBuiltinUrl("oidc", props.status, state, redirectUri),
    });
  }
  if (props.status.linuxdo_oauth) {
    providers.push({
      key: "linuxdo",
      label: t("AUTH.OAUTH.LINUXDO"),
      icon: <Icon name="log-in" className="h-4 w-4" />,
      buildUrl: (state, redirectUri) =>
        buildBuiltinUrl("linuxdo", props.status, state, redirectUri),
    });
  }

  for (const custom of props.status.custom_oauth_providers ?? []) {
    providers.push({
      key: custom.slug,
      label: custom.name,
      icon: <Icon name="log-in" className="h-4 w-4" />,
      buildUrl: (state, redirectUri) => {
        const params = new URLSearchParams({
          client_id: custom.client_id,
          state,
          response_type: "code",
          scope: custom.scopes || "openid profile email",
          redirect_uri: redirectUri,
        });
        return `${custom.authorization_endpoint}?${params.toString()}`;
      },
    });
  }

  if (providers.length === 0) return null;

  async function handleOAuth(provider: OAuthProvider) {
    setLoading(provider.key);
    analytics.auth.oauthInitiated(provider.key);
    try {
      const callbackUrl = `${window.location.origin}/api/auth/account/oauth/callback`;
      const affCode = getCookie(AFF_CODE_KEY);
      const state = handleElysia(
        await rpc.api.auth.account.oauth.state.get({
          query: {
            redirect: callbackUrl,
            aff: typeof affCode === "string" ? affCode : undefined,
          },
        }),
      );
      const redirectUri = `${serverAddress}/api/oauth/${provider.key}`;
      window.location.href = provider.buildUrl(state, redirectUri);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative flex items-center gap-4">
        <div className="bg-border/60 h-px flex-1" />
        <span className="text-muted-foreground text-xs tracking-wider uppercase">
          {t("AUTH.OR_CONTINUE_WITH")}
        </span>
        <div className="bg-border/60 h-px flex-1" />
      </div>

      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <button
            key={provider.key}
            onClick={() => handleOAuth(provider)}
            disabled={loading !== null}
            className="border-border/60 bg-background/60 hover:bg-accent text-foreground flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === provider.key ? (
              <span className="text-muted-foreground text-xs">...</span>
            ) : (
              <>
                {provider.icon}
                {provider.label}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
