"use client";

import { ProviderConsentDialog } from "@/components/elements/model/provider-consent-panel";
import { ProviderList } from "@/components/pages/navbar/consents/provider-list";
import type { ProviderHandlers } from "@/components/pages/navbar/consents/provider-parts";
import {
  otherProviderRow,
  type ProviderRow,
} from "@/components/pages/navbar/consents/provider-rows";
import { Button } from "@/components/ui/button";
import {
  useModelProviderConsentsQuery,
  useRevokeProviderConsentMutation,
} from "@/hooks/auth/provider-consent-hook";
import { Link } from "@/i18n/navigation";
import type { getVendorTheme } from "@/lib/config/vendor-registry";
import { DataTableId } from "@/lib/types/enums";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SectionHeading } from "./shared/section-heading";

export function ModelConsentSection(props: {
  model: string;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const query = useModelProviderConsentsQuery(props.model);
  const revokeMutation = useRevokeProviderConsentMutation();
  // undefined: closed; [] grants every missing provider of the model.
  const [granting, setGranting] = useState<string[] | undefined>();

  if (!query.data) return null;

  const providers = query.data.providers ?? [];
  const missing = providers.filter((p) => p.status === "missing");
  const covered = providers.filter((p) => p.status !== "missing");
  const others = (query.data.other_providers ?? []).map(otherProviderRow);
  const rows: ProviderRow[] = [...missing, ...covered, ...others].filter(
    (p) => p.active,
  );
  const handlers: ProviderHandlers = {
    open: (alias) => setGranting([alias]),
    revoke: (alias) => revokeMutation.mutate({ body: { alias } }),
    revoking: revokeMutation.isPending,
  };

  return (
    <section className="mt-12">
      <SectionHeading
        theme={props.theme}
        action={
          missing.length > 0 && (
            <Button size="xs" onClick={() => setGranting([])}>
              {t("PROVIDER_CONSENT.FOCUS.GRANT_ALL", { count: missing.length })}
            </Button>
          )
        }
      >
        {t("SIDEBAR.CONSENTS")}
      </SectionHeading>
      <p className="text-muted-foreground mb-2 text-sm">
        {providers.length === 0
          ? t("PROVIDER_CONSENT.FOCUS.NONE_NEEDED", { model: props.model })
          : missing.length > 0
            ? t("PROVIDER_CONSENT.FOCUS.TITLE", { model: props.model })
            : t("PROVIDER_CONSENT.FOCUS.COVERED", { model: props.model })}
      </p>
      {rows.length > 0 && (
        <ProviderList
          id={DataTableId.PROVIDER_CONSENTS_MODEL}
          providers={rows}
          view="table"
          handlers={handlers}
        />
      )}
      <Link
        href={{ pathname: "/consents", query: { model: props.model } }}
        className="text-primary mt-2 inline-block text-xs underline-offset-4 hover:underline"
      >
        {t("MODELS.VIEW_DETAILS")}
      </Link>
      <ProviderConsentDialog
        open={granting !== undefined}
        model={granting?.length === 0 ? props.model : undefined}
        aliases={granting}
        onClose={() => setGranting(undefined)}
      />
    </section>
  );
}
