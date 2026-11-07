"use client";

import { Link } from "@/i18n/navigation";
import { modelHref } from "@/lib/utils/base";
import type { PricingCatalogModel } from "@/openapi";

// A real href for crawlers and new-tab clicks. With `intercept`, a plain click
// bubbles to the row, which opens the detail sheet instead of navigating.
export function ModelPageLink(props: {
  model: PricingCatalogModel;
  intercept?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={modelHref(props.model.model_name, props.model.vendor)}
      prefetch={false}
      className={props.className}
      onClick={(e) => {
        if (!props.intercept) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
          e.stopPropagation();
          return;
        }
        e.preventDefault();
      }}
    >
      {props.children}
    </Link>
  );
}
