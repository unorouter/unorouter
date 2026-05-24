import { ConsentForm } from "@/components/pages/auth/consent-form";
import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { Link, redirect } from "@/i18n/navigation";
import { APP_VALUES, AUTH_REDIRECT_QUERY } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale, setCookies } from "@/lib/utils/server";
import {
  authRequestInfoChecker,
  type AuthRequestInfo,
} from "@/lib/validation/auth";
import { safeParse } from "@/lib/validation/helpers";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/consent",
    title: t("AUTH.CONSENT.META_TITLE", APP_VALUES),
    description: t("AUTH.CONSENT.META_DESCRIPTION", APP_VALUES),
    keywords: "",
    robots: false,
  });
}

type ConsentSearchParams = {
  authRequestID?: string;
};

async function fetchAuthRequestInfo(
  id: string,
): Promise<AuthRequestInfo | null> {
  const res = await fetch(
    `${env.apiUrl}/oauth/v1/authorize/info?id=${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = safeParse(authRequestInfoChecker, json as AuthRequestInfo);
  return parsed.success ? parsed.data : null;
}

export default async function ConsentPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ConsentSearchParams>;
}) {
  const params = await props.searchParams;
  const locale = await serverLocale(props);
  const t = await getTranslations();
  const authRequestID = params.authRequestID ?? "";

  // Consent REQUIRES a session. If the user isn't logged in, redirect them
  // to /login?redirect=/consent?... and the global AuthRedirectCapture
  // listener stashes the return URL as a cookie, and the login form reads
  // it on success to bring them back here.
  const response = await rpc.api.auth.account.self.get(await setCookies());
  if (response.status !== 200) {
    redirect({
      href: {
        pathname: "/login",
        query: {
          [AUTH_REDIRECT_QUERY]: `/consent${authRequestID ? `?authRequestID=${authRequestID}` : ""}`,
        },
      },
      locale,
    });
  }

  const info = authRequestID ? await fetchAuthRequestInfo(authRequestID) : null;

  return (
    <div className="from-background via-muted to-background flex min-h-dvh flex-col items-center justify-center bg-linear-to-br px-4 py-12">
      <div className="animate-slide-up mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <LogoImage width={36} height={36} />
          <CompanyName className="text-foreground font-mono text-xl" />
        </Link>
      </div>

      <ConsentForm
        callbackId={authRequestID}
        clientId={info?.client_id ?? ""}
        scope={info?.scope ?? ""}
      />

      <p className="text-muted-foreground animate-fade-in mt-8 text-center text-xs">
        <Link href="/terms" className="hover:text-foreground transition-colors">
          {t("FOOTER.LEGAL_TERMS")}
        </Link>
        {" · "}
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          {t("FOOTER.LEGAL_PRIVACY")}
        </Link>
      </p>
    </div>
  );
}
