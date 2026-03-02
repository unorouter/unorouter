import { Link } from "@/i18n/navigation";
import { LuBuilding2, LuEye, LuFileText, LuMail, LuMapPin } from "react-icons/lu";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations();
  const year = String(new Date().getFullYear());

  return (
    <footer className="relative bg-background border-t border-border py-16">
      <div className="max-w-360 mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground text-lg">UnoRouter</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("FOOTER.DESCRIPTION")}
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("FOOTER.PRODUCT")}</h4>
            <div className="space-y-3">
              <FooterLink
                href="/models"
                icon={<LuBuilding2 className="h-4 w-4 text-muted-foreground" />}
              >
                {t("FOOTER.MODELS")}
              </FooterLink>
              <FooterLink
                href="/pricing"
                icon={<LuMapPin className="h-4 w-4 text-muted-foreground" />}
              >
                {t("FOOTER.PRICING")}
              </FooterLink>
              <FooterLink
                href="/docs/claude-code"
                icon={<LuFileText className="h-4 w-4 text-muted-foreground" />}
              >
                {t("FOOTER.DOCUMENTATION")}
              </FooterLink>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("FOOTER.LEGAL")}</h4>
            <div className="space-y-3">
              <FooterLink
                href="/terms"
                icon={<LuFileText className="h-4 w-4 text-muted-foreground" />}
              >
                {t("FOOTER.TERMS")}
              </FooterLink>
              <FooterLink
                href="/privacy"
                icon={<LuEye className="h-4 w-4 text-muted-foreground" />}
              >
                {t("FOOTER.PRIVACY")}
              </FooterLink>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("FOOTER.CONTACT_TITLE")}</h4>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">{t("FOOTER.CONTACT_SUBTITLE")}</p>
              <a
                href="mailto:support@unorouter.ai"
                className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <LuMail className="h-4 w-4 text-muted-foreground" />
                support@unorouter.ai
              </a>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://github.com/QuantumNous"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200 block"
              >
                {t("FOOTER.SOCIAL_GITHUB")}
              </a>
              <a
                href="https://x.com/unorouter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200 block"
              >
                {t("FOOTER.SOCIAL_X")}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-8">
          <div className="text-center pt-6 border-t border-border">
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
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
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
      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm cursor-pointer transition-colors duration-200">
        {props.icon}
        {props.children}
      </div>
    </Link>
  );
}
