"use client";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function FieldGroup(props: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      {...props}
      className={cn("flex w-full flex-col gap-2.5", props.className)}
    />
  );
}

export function FieldSeparator(props: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-separator"
      {...props}
      className={cn("relative -my-1 h-3", props.className)}
    >
      <Separator className="absolute inset-x-0 top-1/2" />
    </div>
  );
}
