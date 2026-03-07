"use client";

import { useStatusQuery } from "@/hooks/status-hook";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FaDiscord, FaGithub, FaTelegram } from "react-icons/fa";
import { LuLogIn } from "react-icons/lu";

type StatusData = NonNullable<ReturnType<typeof useStatusQuery>["data"]>;

interface OAuthButtonsProps {
  status: StatusData;
}

function buildOAuthUrl(
  provider: string,
  status: StatusData,
  state: string,
): string | null {
  const serverAddress =
    status.server_address || process.env.NEXT_PUBLIC_API_URL;
  const redirectUri = `${serverAddress}/oauth/${provider}`;

  switch (provider) {
    case "github":
      return `https://github.com/login/oauth/authorize?client_id=${status.github_client_id}&state=${state}&scope=user:email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    case "discord":
      return `https://discord.com/api/oauth2/authorize?client_id=${status.discord_client_id}&state=${state}&response_type=code&scope=identify+email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    case "oidc":
      return `${status.oidc_authorization_endpoint}?client_id=${status.oidc_client_id}&state=${state}&response_type=code&scope=openid+profile+email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    case "linuxdo":
      return `https://connect.linux.do/oauth2/authorize?client_id=${status.linuxdo_client_id}&state=${state}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
    default:
      return null;
  }
}

export function OAuthButtons(props: OAuthButtonsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState<string | null>(null);

  const providers: Array<{
    key: string;
    enabled: boolean;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "github",
      enabled: props.status.github_oauth,
      label: t("AUTH.SIGN_IN_WITH_GITHUB"),
      icon: <FaGithub className="h-4 w-4" />,
    },
    {
      key: "discord",
      enabled: props.status.discord_oauth,
      label: t("AUTH.SIGN_IN_WITH_DISCORD"),
      icon: <FaDiscord className="h-4 w-4" />,
    },
    {
      key: "oidc",
      enabled: props.status.oidc_enabled,
      label: t("AUTH.SIGN_IN_WITH_OIDC"),
      icon: <LuLogIn className="h-4 w-4" />,
    },
    {
      key: "linuxdo",
      enabled: props.status.linuxdo_oauth,
      label: t("AUTH.SIGN_IN_WITH_LINUXDO"),
      icon: <LuLogIn className="h-4 w-4" />,
    },
  ];

  const customProviders = (props.status.custom_oauth_providers || []) as Array<{
    id: number;
    name: string;
    slug: string;
    icon: string;
    client_id: string;
    authorization_endpoint: string;
    scopes: string;
  }>;
  const enabledProviders = providers.filter((p) => p.enabled);
  const hasAnyOAuth = enabledProviders.length > 0 || customProviders.length > 0;

  if (!hasAnyOAuth) return null;

  async function handleOAuth(
    provider: string,
    customAuthEndpoint?: string,
    customClientId?: string,
    customScopes?: string,
  ) {
    setLoading(provider);
    try {
      const callbackUrl = `${window.location.origin}/${locale}/callback`;
      const state = handleElysia(
        await rpc.api.auth.oauth.state.get({
          query: { redirect: callbackUrl },
        }),
      ) as string;

      let url: string | null;
      if (customAuthEndpoint) {
        const serverAddress =
          props.status.server_address || process.env.NEXT_PUBLIC_API_URL;
        const redirectUri = `${serverAddress}/oauth/${provider}`;
        url = `${customAuthEndpoint}?client_id=${customClientId}&state=${state}&response_type=code&scope=${encodeURIComponent(customScopes || "openid profile email")}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      } else {
        url = buildOAuthUrl(provider, props.status, state);
      }

      if (url) window.location.href = url;
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
        {enabledProviders.map((provider) => (
          <button
            key={provider.key}
            onClick={() => handleOAuth(provider.key)}
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

        {customProviders.map((provider) => (
          <button
            key={provider.slug}
            onClick={() =>
              handleOAuth(
                provider.slug,
                provider.authorization_endpoint,
                provider.client_id,
                provider.scopes,
              )
            }
            disabled={loading !== null}
            className="border-border/60 bg-background/60 hover:bg-accent text-foreground flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === provider.slug ? (
              <span className="text-muted-foreground text-xs">...</span>
            ) : (
              <>
                <LuLogIn className="h-4 w-4" />
                {provider.name}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
