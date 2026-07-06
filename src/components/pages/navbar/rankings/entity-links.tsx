"use client";

import { getPathname, Link } from "@/i18n/navigation";
import { modelHref } from "@/lib/utils/base";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

type EntityLinkBaseProps = {
  className?: string;
  children?: React.ReactNode;
};

type ModelLinkProps = EntityLinkBaseProps & {
  modelName: string;
  vendor?: string;
};

export function ModelLink(props: ModelLinkProps) {
  return (
    <Link
      href={modelHref(props.modelName, props.vendor)}
      className={cn(
        "decoration-foreground/30 hover:decoration-foreground underline decoration-1 underline-offset-4 transition-colors",
        props.className,
      )}
    >
      {props.children ?? props.modelName}
    </Link>
  );
}

type VendorLinkProps = EntityLinkBaseProps & {
  vendor: string;
};

export function VendorLink(props: VendorLinkProps) {
  const locale = useLocale();
  const modelsPath = getPathname({ locale, href: "/models" });
  const href = `${modelsPath}?vendor=${encodeURIComponent(props.vendor)}`;

  return (
    <a
      href={href}
      className={cn(
        "hover:text-foreground underline decoration-current/40 decoration-1 underline-offset-2 transition-colors hover:decoration-current",
        props.className,
      )}
    >
      {props.children ?? props.vendor}
    </a>
  );
}
