import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("FOOTER");
  const year = String(new Date().getFullYear());

  return (
    <footer className="border-border bg-card border-t">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("PRODUCT")}</h3>
            <ul className="space-y-3">
              <FooterLink href="/">{t("MODELS")}</FooterLink>
              <FooterLink href="/">{t("PRICING")}</FooterLink>
              <FooterLink href="/">{t("DOCUMENTATION")}</FooterLink>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("COMPANY")}</h3>
            <ul className="space-y-3">
              <FooterLink href="/privacy">{t("PRIVACY")}</FooterLink>
              <FooterLink href="/terms">{t("TERMS")}</FooterLink>
              <FooterExternalLink href="mailto:support@unorouter.ai">
                {t("CONTACT")}
              </FooterExternalLink>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("CONNECT")}</h3>
            <ul className="space-y-3">
              <FooterExternalLink href="https://github.com/QuantumNous">
                GitHub
              </FooterExternalLink>
              <FooterExternalLink href="https://x.com/unorouter">
                X
              </FooterExternalLink>
            </ul>
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-12 border-t pt-6 text-sm">
          {t("COPYRIGHT", { year })}
        </div>
      </div>
    </footer>
  );
}

function FooterLink(props: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={props.href}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        {props.children}
      </Link>
    </li>
  );
}

function FooterExternalLink(props: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        {props.children}
      </a>
    </li>
  );
}
