"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

const appName = process.env.NEXT_PUBLIC_APP_NAME;

export function LogoImage(
  props: Omit<React.ComponentProps<typeof Image>, "src" | "alt">,
) {
  return (
    <Image
      src="/logo.webp"
      alt={appName}
      width={32}
      height={32}
      {...props}
      className={cn("rounded-full", props.className)}
    />
  );
}

export function CompanyName(props: { className?: string }) {
  const mid = appName.slice(1).search(/[A-Z]/) + 1;
  return (
    <span className={cn("font-bold tracking-tight", props.className)}>
      {appName.slice(0, mid).toUpperCase()}
      <span className="text-muted-foreground">
        {appName.slice(mid).toUpperCase()}
      </span>
    </span>
  );
}
