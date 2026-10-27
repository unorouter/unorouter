"use client";

import { OwnPurposeObjectionToggle } from "@/components/elements/model/own-purpose-objection-toggle";
import { ProviderConsentDialog } from "@/components/elements/model/provider-consent-panel";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { msg } from "@/lib/config/constants";
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
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <h2 className="text-foreground text-sm font-medium">
            {t("OWN_PURPOSE.TITLE")}
          </h2>
          <OwnPurposeObjectionToggle />
        </div>
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

      <ProviderConsentDialog
        open={params.alias !== null}
        aliases={params.alias === null ? undefined : [params.alias]}
        onClose={close}
      />
    </div>
  );
}
