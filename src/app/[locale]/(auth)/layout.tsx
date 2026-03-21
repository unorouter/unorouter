import { CompanyName, LogoImage } from "@/components/elements/brand";
import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense, ReactNode } from "react";

export default async function AuthLayout(props: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="from-background via-muted to-background flex min-h-dvh flex-col items-center justify-center bg-linear-to-br px-4 py-12">
      <div className="animate-slide-up mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <LogoImage width={36} height={36} />
          <CompanyName className="text-foreground font-mono text-xl" />
        </Link>
      </div>

      <Suspense>
        <AffiliateCapture />
      </Suspense>

      {props.children}

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
