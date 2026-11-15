"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuthUser, useLogoutMutation } from "@/hooks/auth/auth-hook";
import {
  useAcceptTermsMutation,
  useTermsAcceptanceQuery,
} from "@/hooks/auth/terms-acceptance-hook";
import { Link } from "@/i18n/navigation";
import { TERMS_VERSION } from "@/i18n/terms-version";
import { useLocale, useTranslations } from "next-intl";

// Blocks the signed-in app until the current terms version is accepted. Only
// the web session is asked; API keys keep working regardless.
export function TermsAcceptanceGate() {
  const t = useTranslations();
  const locale = useLocale();
  const user = useAuthUser();
  const query = useTermsAcceptanceQuery(!!user);
  const acceptMutation = useAcceptTermsMutation();
  const logoutMutation = useLogoutMutation();

  // Versions are dates, so text order is time order.
  const outdated =
    !!user && !!query.data && (query.data.version ?? "") < TERMS_VERSION;
  if (!outdated) return null;

  const title = t("AUTH.TERMS_UPDATE.TITLE");
  const paragraphs = [
    t("AUTH.TERMS_UPDATE.INTRO"),
    t("AUTH.TERMS_UPDATE.CHANGES"),
  ];
  const links = t.markup("AUTH.TERMS_UPDATE.LINKS", {
    terms: (chunks) => chunks,
    privacy: (chunks) => chunks,
  });
  const busy = acceptMutation.isPending || logoutMutation.isPending;

  function accept() {
    // Stored verbatim as the proof of what was shown.
    const text = [title, ...paragraphs, links].join("\n\n");
    acceptMutation.mutate({ body: { version: TERMS_VERSION, locale, text } });
  }

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          {paragraphs.map((paragraph) => (
            <AlertDialogDescription key={paragraph}>
              {paragraph}
            </AlertDialogDescription>
          ))}
          <p className="text-muted-foreground text-sm">
            {t.rich("AUTH.TERMS_UPDATE.LINKS", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-primary underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-primary underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={busy}
          >
            {t("AUTH.TERMS_UPDATE.LOG_OUT")}
          </Button>
          <Button onClick={accept} disabled={busy}>
            {t("AUTH.TERMS_UPDATE.ACCEPT")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
