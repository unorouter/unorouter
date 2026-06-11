"use client";

import { Button } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import {
  getScopeMeta,
  getScopeTranslationKey,
  type ScopeKind,
} from "@/lib/config/oauth-scopes";
import { useTranslations } from "next-intl";

type ConsentFormProps = {
  callbackId: string;
  clientId: string;
  scope: string;
};

const KIND_BADGE: Record<ScopeKind, string> = {
  read: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  write: "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20",
  danger: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
};

export function ConsentForm(props: ConsentFormProps) {
  const t = useTranslations();

  // openid/offline_access are OIDC protocol scopes, not user-visible permissions;
  // suppress them from the list and surface refresh in the bottom session note.
  const PROTOCOL_SCOPES = new Set(["openid", "offline_access"]);
  const allScopes = props.scope
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const scopes = allScopes.filter((s) => !PROTOCOL_SCOPES.has(s));
  const hasOfflineAccess = allScopes.includes("offline_access");

  // Browser POSTs directly to new-api's /authorize/{callback_id}. The server
  // responds with a 302 back to the agent's redirect_uri.
  const submitUrl = `${env.apiUrl}/oauth/v1/authorize/${encodeURIComponent(props.callbackId)}`;

  const invalid = !props.callbackId || !props.clientId;

  if (invalid) {
    return (
      <GlassAuthCard title={t("AUTH.CONSENT.INVALID_TITLE")}>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("AUTH.CONSENT.INVALID")}
          </p>
          <Link
            href="/dashboard"
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-11 w-full items-center justify-center rounded-2xl border text-sm font-medium transition-colors"
          >
            {t("AUTH.CONSENT.RETURN_HOME")}
          </Link>
        </div>
      </GlassAuthCard>
    );
  }

  return (
    <GlassAuthCard className="max-w-lg">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="bg-primary/10 ring-primary/20 text-primary flex size-12 items-center justify-center rounded-2xl ring-1">
          <Icon name="shield-check" className="size-6" />
        </div>
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">
          {t("AUTH.CONSENT.TITLE")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("AUTH.CONSENT.DESCRIPTION", {
            clientId: props.clientId,
            appName: APP_VALUES.appName,
          })}
        </p>
      </div>

      <div className="bg-muted/40 ring-border/60 mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1">
        <div className="bg-background ring-border flex size-10 shrink-0 items-center justify-center rounded-xl ring-1">
          <Icon name="pencil" className="text-muted-foreground size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("AUTH.CONSENT.REQUESTING_APP")}
          </p>
          <p className="text-foreground truncate font-mono text-sm">
            {props.clientId}
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <p className="text-foreground text-sm font-medium">
          {t("AUTH.CONSENT.SCOPES_LABEL")}
        </p>
        <ul className="space-y-2">
          {scopes.map((scope) => {
            const key = getScopeTranslationKey(scope);
            const meta = getScopeMeta(scope);
            return (
              <li
                key={scope}
                className="border-border/60 bg-card/50 flex items-start gap-3 rounded-xl border px-3 py-2.5"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ${KIND_BADGE[meta.kind]}`}
                >
                  <Icon name={meta.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-foreground text-sm leading-tight">
                    {key
                      ? t(key, {
                          appName: APP_VALUES.appName,
                        })
                      : scope}
                  </p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {scope}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-border/60 bg-muted/30 mb-6 space-y-2 rounded-2xl border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon name="credit-card" className="text-muted-foreground size-4" />
          <p className="text-foreground text-sm font-medium">
            {t("AUTH.CONSENT.LIMITS_TITLE")}
          </p>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("AUTH.CONSENT.LIMITS_NOTE")}
        </p>
      </div>

      <form
        method="POST"
        action={submitUrl}
        className="flex flex-col gap-3 sm:flex-row-reverse"
      >
        <Button
          type="submit"
          name="consented"
          value="true"
          className="h-11 flex-1 rounded-2xl"
        >
          {t("AUTH.CONSENT.APPROVE")}
        </Button>
        <Button
          type="submit"
          name="consented"
          value="false"
          variant="outline"
          className="h-11 flex-1 rounded-2xl"
        >
          {t("AUTH.CONSENT.DENY")}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        {hasOfflineAccess
          ? t("AUTH.CONSENT.SECURITY_NOTE_PERSISTENT")
          : t("AUTH.CONSENT.SECURITY_NOTE")}
      </p>
    </GlassAuthCard>
  );
}
