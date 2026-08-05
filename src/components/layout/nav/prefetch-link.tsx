"use client";

import { Link, useRouter } from "@/i18n/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

// Nav chrome renders on every route; next/link's default viewport prefetch
// fans out to ~120 doc RSCs at once (megamenu + sidebar + mobile nav). Warm on
// pointer/focus intent instead so a route is only prefetched when the user aims
// at it.
export function PrefetchLink(props: Props) {
  const router = useRouter();
  const warm = () => {
    if (typeof props.href === "string") router.prefetch(props.href);
  };
  return (
    <Link
      {...props}
      prefetch={false}
      onMouseEnter={(e) => {
        warm();
        props.onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        props.onFocus?.(e);
      }}
    />
  );
}
