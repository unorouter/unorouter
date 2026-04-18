"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BreakoutGameLazy } from "./breakout-game-lazy";

type BreakoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BreakoutDialog(props: BreakoutDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[min(92vw,960px)] gap-0 overflow-hidden bg-black p-0 sm:max-w-240">
        {props.open ? <BreakoutGameLazy /> : null}
      </DialogContent>
    </Dialog>
  );
}
