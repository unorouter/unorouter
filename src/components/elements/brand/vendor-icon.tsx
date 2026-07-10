"use client";

import {
  ALIAS_LOADERS,
  VENDOR_LOADERS,
  type IconComponent,
  type IconLoader,
} from "@/lib/config/vendor-registry";
import dynamic from "next/dynamic";

const LOADERS: Record<string, IconLoader> = {
  ...VENDOR_LOADERS,
  ...ALIAS_LOADERS,
};

const cache = new Map<string, IconComponent>();

function getIcon(vendor: string): IconComponent | null {
  const hit = cache.get(vendor);
  if (hit) return hit;

  const normalized = vendor.toLowerCase();
  const key = Object.keys(LOADERS).find((k) => normalized.includes(k));
  if (!key) return null;

  const Icon = dynamic(LOADERS[key], {
    loading: () => (
      <span className="bg-muted/50 inline-block size-full rounded-sm" />
    ),
  }) as IconComponent;
  cache.set(vendor, Icon);
  return Icon;
}

type VendorIconProps = {
  vendor: string;
  size?: number;
  className?: string;
};

export function VendorIcon(props: VendorIconProps) {
  const size = props.size ?? 20;
  // eslint-disable-next-line react-hooks/static-components -- icon component is cached in module-scope cache keyed by vendor, referentially stable across renders
  const Icon = getIcon(props.vendor);

  if (!Icon) {
    return (
      <span
        className={`bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${props.className ?? ""}`}
        style={{ width: size, height: size }}
      >
        {props.vendor.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${props.className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- Icon is cached in module-scope cache, referentially stable */}
      <Icon size={size} />
    </span>
  );
}
