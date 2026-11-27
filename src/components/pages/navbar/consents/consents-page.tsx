"use client";

import { OwnPurposeObjectionToggle } from "@/components/elements/model/own-purpose-objection-toggle";
import { ProviderConsentDialog } from "@/components/elements/model/provider-consent-panel";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link } from "@/i18n/navigation";
import type { IconName } from "@/lib/config/icon-map";
import { AUTH_REDIRECT_QUERY, msg } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ModelFocus } from "./model-focus";
import { ModelView } from "./model-view";
import { ProviderView } from "./provider-view";

const TABS = ["providers", "models"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL = {
  providers: msg("CONSENT.TAB_PROVIDERS"),
  models: msg("CONSENT.TAB_MODELS"),
} satisfies Record<Tab, ReturnType<typeof msg>>;

const TAB_ICON: Record<Tab, IconName> = {
  providers: "server",
  models: "layout-grid",
};

// The gateway's refusal links to /consents?model=<name>, which lands on that
// model's missing providers; the provider dialog lives in the URL too.
const PARSERS = {
  tab: parseAsStringLiteral(TABS).withDefault("providers"),
  view: parseAsStringLiteral(["table", "list"] as const).withDefault("table"),
  model: parseAsString,
  alias: parseAsString,
};

export function ConsentsPage() {
  const t = useTranslations();
  const [params, setParams] = useQueryStates(PARSERS);
  const token = useApiKey();
  const authQuery = useAuthQuery();

  function close() {
    void setParams({ alias: null });
  }

  return (
    <div className="w-full pt-20 pb-16">
      <div className="mb-4 space-y-3 px-4 md:px-6">
        <h1 className="text-lg font-semibold tracking-tight">
          {t("CONSENT.PAGE_TITLE")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("CONSENT.PAGE_INTRO")}
        </p>
        {authQuery.data && (
          <div className="border-primary/40 bg-primary/10 flex items-center gap-3 rounded-lg border p-4">
            <Icon
              name="circle-check"
              className="text-primary h-5 w-5 shrink-0"
            />
            <p className="text-foreground min-w-0 flex-1 text-sm">
              {t("CONSENT.SIGNED_IN_NOTICE", {
                name: authQuery.data.display_name || authQuery.data.username,
              })}
            </p>
          </div>
        )}
        {!token.isLoggedIn && (
          <div className="border-warning/40 bg-warning/10 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <Icon
              name="triangle-alert"
              className="text-warning h-5 w-5 shrink-0"
            />
            <p className="text-foreground min-w-0 flex-1 text-sm">
              {t("CONSENT.GUEST_NOTICE")}
            </p>
            <Link
              href={{
                pathname: "/login",
                query: { [AUTH_REDIRECT_QUERY]: "/consents" },
              }}
              className="text-primary text-sm font-medium underline"
            >
              {t("CONSENT.GUEST_LOGIN")}
            </Link>
          </div>
        )}
        <div className="border-border flex gap-1 border-b pb-px">
          {TABS.map((tab) => {
            const active = params.tab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => void setParams({ tab, model: null })}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                <Icon name={TAB_ICON[tab]} className="h-4 w-4" />
                {t(TAB_LABEL[tab])}
              </button>
            );
          })}
        </div>
      </div>

      {params.model !== null ? (
        <ModelFocus
          model={params.model}
          view={params.view}
          onClear={() => void setParams({ model: null })}
          onOpenAlias={(alias) => void setParams({ alias })}
        />
      ) : params.tab === "providers" ? (
        <ProviderView
          view={params.view}
          onViewChange={(view) => void setParams({ view })}
          onOpen={(alias) => void setParams({ alias, model: null })}
        />
      ) : (
        <ModelView
          view={params.view}
          onViewChange={(view) => void setParams({ view })}
          onOpen={(model) =>
            void setParams({ model, tab: "providers", alias: null })
          }
        />
      )}

      <div className="mt-6 px-4 md:px-6">
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <h2 className="text-foreground text-sm font-medium">
            {t("OWN_PURPOSE.TITLE")}
          </h2>
          <p className="text-warning flex items-start gap-1.5 text-sm">
            <Icon name="triangle-alert" className="mt-0.5 h-4 w-4 shrink-0" />
            {t("OWN_PURPOSE.NOT_CONSENT")}
          </p>
          <OwnPurposeObjectionToggle />
        </div>
      </div>

      <ProviderConsentDialog
        open={params.alias !== null}
        aliases={params.alias === null ? undefined : [params.alias]}
        onClose={close}
      />
    </div>
  );
}
