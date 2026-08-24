"use client";

import {
  ALIAS_LOADERS,
  VENDOR_LOADERS,
  type IconComponent,
  type IconLoader,
} from "@/lib/config/vendor-registry";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

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

  const Icon: IconComponent = dynamic(LOADERS[key], {
    loading: () => (
      <span className="bg-muted/50 inline-block size-full rounded-sm" />
    ),
  });
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
  // The lazy icon only renders after mount: dynamic() is called at runtime
  // (no preload manifest entry), so during SSR the server inlines the svg but
  // the client suspends into the loading fallback mid-hydration - an
  // element-type mismatch (React #418). Pre-mount both sides render the
  // deterministic letter fallback instead.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  // eslint-disable-next-line react-hooks/static-components -- icon component is cached in module-scope cache keyed by vendor, referentially stable across renders
  const Icon = mounted ? getIcon(props.vendor) : null;

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
