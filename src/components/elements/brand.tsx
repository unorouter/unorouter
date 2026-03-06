"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

export function LogoImage(
  props: Omit<React.ComponentProps<typeof Image>, "src" | "alt">,
) {
  return (
    <Image
      src="/logo.webp"
      alt="UnoRouter"
      width={32}
      height={32}
      {...props}
      className={cn("rounded-full", props.className)}
    />
  );
}

export function CompanyName(props: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight", props.className)}>
      UNO<span className="text-muted-foreground">ROUTER</span>
    </span>
  );
}
