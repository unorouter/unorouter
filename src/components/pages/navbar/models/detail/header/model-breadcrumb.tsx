import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { vendorDisplayName } from "@/lib/api/pricing";
import { getTranslations } from "next-intl/server";

interface ModelBreadcrumbProps {
  vendorName: string;
  vendorHref: string;
  modelName: string;
}

export async function ModelBreadcrumb(props: ModelBreadcrumbProps) {
  const t = await getTranslations();
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground flex flex-wrap items-center gap-1.5 font-mono text-[11px] tracking-wide"
    >
      <Link href="/models" className="hover:text-foreground transition-colors">
        {t("NAV.MODELS")}
      </Link>
      <Icon name="chevron-right" className="h-3 w-3 shrink-0" />
      <a
        href={props.vendorHref}
        className="hover:text-foreground transition-colors"
      >
        {vendorDisplayName(props.vendorName)}
      </a>
      <Icon name="chevron-right" className="h-3 w-3 shrink-0" />
      <span className="text-foreground max-w-[50vw] truncate">
        {props.modelName}
      </span>
    </nav>
  );
}
