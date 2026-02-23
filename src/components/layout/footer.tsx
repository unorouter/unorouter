import { Link } from "@/i18n/navigation";
import { LuBuilding2, LuEye, LuFileText, LuMail, LuMapPin } from "react-icons/lu";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("FOOTER");
  const year = String(new Date().getFullYear());

  return (
    <footer className="relative bg-[#050505] border-t border-white/10 py-16">
      <div className="max-w-360 mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg">UnoRouter</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("DESCRIPTION")}
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">{t("PRODUCT")}</h4>
            <div className="space-y-3">
              <FooterLink
                href="/models"
                icon={<Building2 className="h-4 w-4 text-gray-500" />}
              >
                {t("MODELS")}
              </FooterLink>
              <FooterLink
                href="/pricing"
                icon={<MapPin className="h-4 w-4 text-gray-500" />}
              >
                {t("PRICING")}
              </FooterLink>
              <FooterLink
                href="/docs/claude-code"
                icon={<FileText className="h-4 w-4 text-gray-500" />}
              >
                {t("DOCUMENTATION")}
              </FooterLink>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">{t("LEGAL")}</h4>
            <div className="space-y-3">
              <FooterLink
                href="/terms"
                icon={<FileText className="h-4 w-4 text-gray-500" />}
              >
                {t("TERMS")}
              </FooterLink>
              <FooterLink
                href="/privacy"
                icon={<Eye className="h-4 w-4 text-gray-500" />}
              >
                {t("PRIVACY")}
              </FooterLink>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">{t("CONTACT_TITLE")}</h4>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">{t("CONTACT_SUBTITLE")}</p>
              <a
                href="mailto:support@unorouter.ai"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <Mail className="h-4 w-4 text-gray-500" />
                support@unorouter.ai
              </a>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://github.com/QuantumNous"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200 block"
              >
                GitHub
              </a>
              <a
                href="https://x.com/unorouter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200 block"
              >
                X
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-8">
          <div className="text-center pt-6 border-t border-white/10">
            <p className="text-gray-500 text-xs">
              By using this platform, you acknowledge that you have read and
              agreed to our
              <Link href="/terms">
                <span className="text-gray-400 hover:text-white ml-1 transition-colors duration-200">
                  Terms of Service
                </span>
              </Link>
              <span className="mx-1">and</span>
              <Link href="/privacy">
                <span className="text-gray-400 hover:text-white transition-colors duration-200">
                  Privacy Policy
                </span>
              </Link>
            </p>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-gray-500 text-xs">
                {t("COPYRIGHT", { year })}
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
      <div className="flex items-center gap-2 text-gray-400 hover:text-white text-sm cursor-pointer transition-colors duration-200">
        {props.icon}
        {props.children}
      </div>
    </Link>
  );
}
