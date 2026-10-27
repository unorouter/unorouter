"use client";

import {
  providerName,
  providerPractice,
  type Practice,
} from "@/lib/api/provider-consent";
import { countryName } from "@/components/elements/model/group-data-policy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import {
  useGrantProviderConsentMutation,
  useModelProviderConsentsQuery,
  useProviderConsentsQuery,
} from "@/hooks/auth/provider-consent-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { APP_VALUES } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import type { ProviderConsentItem } from "@/openapi";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

function outerClass(inDialog?: boolean) {
  return inDialog
    ? "flex flex-col"
    : "flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-4 sm:p-8";
}

function cardClass(inDialog?: boolean) {
  return inDialog
    ? "space-y-3 px-5 pt-6 pb-5 sm:px-8 sm:pt-8"
    : "bg-card my-auto w-full max-w-xl space-y-3 rounded-lg border p-5";
}

function PanelLoader() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Icon
        name="loader"
        className="text-muted-foreground h-5 w-5 animate-spin"
      />
    </div>
  );
}

// From the model view the gateway grants every missing provider of the model;
// from the provider view exactly the chosen aliases.
function useTargets(props: { model?: string; aliases?: string[] }) {
  const modelQuery = useModelProviderConsentsQuery(
    props.model ?? null,
    props.model !== undefined,
  );
  const listQuery = useProviderConsentsQuery(props.model === undefined);
  if (props.model !== undefined) {
    if (!modelQuery.data) return null;
    return (modelQuery.data.providers ?? []).filter(
      (p) => p.status === "missing",
    );
  }
  if (!listQuery.data) return null;
  const chosen = new Set(props.aliases ?? []);
  return (listQuery.data.providers ?? []).filter((p) => chosen.has(p.alias));
}

export function ProviderConsentPanel(props: {
  model?: string;
  aliases?: string[];
  onDone?: () => void;
  onGranted?: () => void;
  // The dialog already frames the text, so the page padding and card border go.
  inDialog?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const token = useApiKey();
  const grantMutation = useGrantProviderConsentMutation();
  const found = useTargets(props);
  const [declined, setDeclined] = useState(false);

  if (!found) return <PanelLoader />;
  const targets = found;

  if (targets.length === 0)
    return (
      <div className={outerClass(props.inDialog)}>
        <div className={cardClass(props.inDialog)}>
          <p className="text-muted-foreground text-sm">
            {t("PROVIDER_CONSENT.NOTHING_MISSING")}
          </p>
          {props.onDone && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={props.onDone}>
                {t("PROVIDER_CONSENT.CLOSE")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );

  const named = (p: ProviderConsentItem) =>
    `${providerName(p)} (${countryName(p.country, locale)})`;
  const unsafe = [
    ...new Set(
      targets
        .filter((p) => p.unsafe && !p.onward_unvetted)
        .map((p) => countryName(p.country, locale)),
    ),
  ];
  // Seat country is safe, the risk is where the provider passes inputs on.
  const onward = targets.filter((p) => p.onward_unvetted).map(named);
  const ofPractice = (practice: Practice) => {
    const listed = targets.filter((p) => providerPractice(p) === practice);
    return { providers: listed.map(named).join(", "), count: listed.length };
  };
  const trains = ofPractice("trains");
  const retains = ofPractice("retains");
  const unknown = ofPractice("unknown");
  const practiceLines = {
    trains:
      trains.count > 0
        ? [t("PROVIDER_CONSENT.PRACTICE_TEXT.TRAINS", trains)]
        : [],
    retains:
      retains.count > 0
        ? [t("PROVIDER_CONSENT.PRACTICE_TEXT.RETAINS", retains)]
        : [],
    unknown:
      unknown.count > 0
        ? [t("PROVIDER_CONSENT.PRACTICE_TEXT.UNKNOWN", unknown)]
        : [],
  };
  const where = token.isLoggedIn
    ? t("FREE_CONSENT.WHERE_ACCOUNT")
    : t("FREE_CONSENT.WHERE_GUEST");
  const title = t("PROVIDER_CONSENT.TITLE");
  const paragraphs = [
    t("PROVIDER_CONSENT.PROVIDERS", {
      providers: targets.map(named).join(", "),
    }),
    ...(props.model
      ? [t("PROVIDER_CONSENT.FOR_MODEL", { model: props.model })]
      : []),
    ...(unsafe.length > 0
      ? [t("FREE_CONSENT.RISK", { countries: unsafe.join(", ") })]
      : []),
    ...(onward.length > 0
      ? [t("PROVIDER_CONSENT.ONWARD_RISK", { providers: onward.join(", ") })]
      : []),
    // What each provider does with inputs, stated as far as it is known.
    ...practiceLines.trains,
    ...practiceLines.retains,
    ...practiceLines.unknown,
    t("FREE_CONSENT.NO_INFLUENCE", APP_VALUES),
    t("FREE_CONSENT.THIRD_PARTY"),
    t("PROVIDER_CONSENT.CONSENT"),
    t("FREE_CONSENT.REVOKE", { where }),
    t("FREE_CONSENT.MORE_INFO"),
  ];

  function confirm() {
    // Stored verbatim on every granted row; the gateway checks it names each
    // provider granted.
    const text = [title, ...paragraphs].join("\n\n");
    grantMutation.mutate(
      {
        body: {
          aliases: props.model ? [] : targets.map((p) => p.alias),
          model: props.model ?? "",
          locale,
          text,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("FREE_CONSENT.SAVED"));
          props.onGranted?.();
          props.onDone?.();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className={outerClass(props.inDialog)}>
      <div className={cardClass(props.inDialog)}>
        <h2
          className={cn(
            "text-foreground text-base font-medium",
            props.inDialog && "pr-8",
          )}
        >
          {title}
        </h2>
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-muted-foreground text-sm">
            {paragraph}
          </p>
        ))}
        <Link
          href="/privacy"
          target="_blank"
          className="text-primary inline-block text-sm underline-offset-4 hover:underline"
        >
          {t("FREE_CONSENT.PRIVACY_LINK")}
        </Link>
        {declined && (
          <p className="text-foreground text-sm font-medium">
            {t("FREE_CONSENT.DECLINED")}
          </p>
        )}
        <div
          className={cn(
            "flex justify-end gap-2 pt-2",
            props.inDialog && "bg-overlay sticky bottom-0 border-t pt-3",
          )}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => (props.onDone ? props.onDone() : setDeclined(true))}
            disabled={grantMutation.isPending}
          >
            {t("FREE_CONSENT.DECLINE")}
          </Button>
          <Button
            size="sm"
            onClick={confirm}
            disabled={grantMutation.isPending}
          >
            {t("FREE_CONSENT.CONFIRM")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProviderConsentDialog(props: {
  open: boolean;
  onClose: () => void;
  model?: string;
  aliases?: string[];
  onGranted?: () => void;
}) {
  const t = useTranslations();
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        <DialogTitle className="sr-only">
          {t("PROVIDER_CONSENT.TITLE")}
        </DialogTitle>
        {props.open && (
          <ProviderConsentPanel
            model={props.model}
            aliases={props.aliases}
            onDone={props.onClose}
            onGranted={props.onGranted}
            inDialog
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
