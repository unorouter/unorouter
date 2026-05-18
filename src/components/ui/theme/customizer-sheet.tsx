"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import dynamic from "next/dynamic";

const ThemeCustomizerBody = dynamic(
  () => import("./customizer-body").then((m) => m.ThemeCustomizerBody),
  { ssr: false },
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ThemeCustomizerSheet(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-none bg-transparent p-3 shadow-none sm:max-w-xs"
      >
        {props.open && <ThemeCustomizerBody />}
      </SheetContent>
    </Sheet>
  );
}
