"use client";

import { vendorHref } from "@/components/pages/navbar/models/detail/resolve-slug";
import { Link } from "@/i18n/navigation";
import { modelHref } from "@/lib/utils/base";
import { cn } from "@/lib/utils";

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
      // Usage logs carry context variants like "claude-opus-5[1m]" that have no page of their own.
      href={modelHref(props.modelName.replace(/\[[^\]]*\]$/, ""), props.vendor)}
      // Every prefetch is a full server render of a model page. One open rankings tab fired
      // about 1,000 a minute (365,000 a day site wide) and took a gateway pod to its memory limit.
      prefetch={false}
      className={cn(
        "decoration-foreground/30 hover:decoration-foreground -my-1 inline-block py-1 underline decoration-1 underline-offset-4 transition-colors",
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
  return (
    <Link
      href={vendorHref(props.vendor)}
      prefetch={false}
      className={cn(
        "hover:text-foreground -my-1 inline-block py-1 underline decoration-current/40 decoration-1 underline-offset-2 transition-colors hover:decoration-current",
        props.className,
      )}
    >
      {props.children ?? props.vendor}
    </Link>
  );
}
