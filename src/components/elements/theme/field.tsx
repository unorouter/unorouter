"use client";

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
