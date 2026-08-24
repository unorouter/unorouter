"use client";

import { Link, useRouter } from "@/i18n/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

// next/link's default viewport prefetch fans out to ~120 doc RSCs at once here.
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
