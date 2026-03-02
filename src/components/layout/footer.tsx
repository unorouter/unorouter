import { Link } from "@/i18n/navigation";
import {
  LuBuilding2,
  LuEye,
  LuFileText,
  LuMail,
  LuMapPin,
} from "react-icons/lu";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations();
  const year = String(new Date().getFullYear());

  return (
    <footer className="bg-background border-border relative border-t py-16">
      <div className="relative z-10 mx-auto max-w-360 px-6">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-bold">UnoRouter</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("FOOTER.DESCRIPTION")}
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="text-foreground font-semibold">
              {t("FOOTER.PRODUCT")}
            </h4>
            <div className="space-y-3">
              <FooterLink
                href="/models"
                icon={<LuBuilding2 className="text-muted-foreground h-4 w-4" />}
              >
                {t("FOOTER.MODELS")}
              </FooterLink>
              <FooterLink
                href="/pricing"
                icon={<LuMapPin className="text-muted-foreground h-4 w-4" />}
              >
                {t("FOOTER.PRICING")}
              </FooterLink>
              <FooterLink
                href="/docs/claude-code"
                icon={<LuFileText className="text-muted-foreground h-4 w-4" />}
              >
                {t("FOOTER.DOCUMENTATION")}
              </FooterLink>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-foreground font-semibold">
              {t("FOOTER.LEGAL")}
            </h4>
            <div className="space-y-3">
              <FooterLink
                href="/terms"
                icon={<LuFileText className="text-muted-foreground h-4 w-4" />}
              >
                {t("FOOTER.TERMS")}
              </FooterLink>
              <FooterLink
                href="/privacy"
                icon={<LuEye className="text-muted-foreground h-4 w-4" />}
              >
                {t("FOOTER.PRIVACY")}
              </FooterLink>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-foreground font-semibold">
              {t("FOOTER.CONTACT_TITLE")}
            </h4>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {t("FOOTER.CONTACT_SUBTITLE")}
              </p>
              <a
                href="mailto:support@unorouter.ai"
                className="text-foreground/80 hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors duration-200"
              >
                <LuMail className="text-muted-foreground h-4 w-4" />
                support@unorouter.ai
              </a>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://github.com/QuantumNous"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground block text-sm transition-colors duration-200"
              >
                {t("FOOTER.SOCIAL_GITHUB")}
              </a>
              <a
                href="https://x.com/unorouter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground block text-sm transition-colors duration-200"
              >
                {t("FOOTER.SOCIAL_X")}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-border border-t pt-8">
          <div className="border-border border-t pt-6 text-center">
            <p className="text-muted-foreground text-xs">
              {t("FOOTER.LEGAL_DISCLAIMER")}
              <Link href="/terms">
                <span className="text-muted-foreground hover:text-foreground ml-1 transition-colors duration-200">
                  {t("FOOTER.LEGAL_TERMS")}
                </span>
              </Link>
              <span className="mx-1">{t("FOOTER.LEGAL_AND")}</span>
              <Link href="/privacy">
                <span className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                  {t("FOOTER.LEGAL_PRIVACY")}
                </span>
              </Link>
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              <p className="text-muted-foreground text-xs">
                {t("FOOTER.COPYRIGHT", { year })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink(props: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link href={props.href}>
      <div className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-sm transition-colors duration-200">
        {props.icon}
        {props.children}
      </div>
    </Link>
  );
}
