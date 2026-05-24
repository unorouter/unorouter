"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { chatStore } from "@/store/chat-store";
import { atom, useAtomValue } from "jotai";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Style the confirm button as a destructive action. */
  destructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

// One pending request at a time. ConfirmProvider renders from this atom;
// `confirm()` writes it through the shared chatStore so it works from any
// handler (event, mutation) without context or prop drilling.
const confirmRequestAtom = atom<ConfirmRequest | null>(null);

// Imperative window.confirm replacement. Awaitable from any handler.
export function confirm(options: ConfirmOptions): Promise<boolean> {
  // A pending confirm is resolved false before a new one replaces it.
  chatStore.get(confirmRequestAtom)?.resolve(false);
  return new Promise<boolean>((resolve) => {
    chatStore.set(confirmRequestAtom, { ...options, resolve });
  });
}

function settle(confirmed: boolean) {
  const request = chatStore.get(confirmRequestAtom);
  if (!request) return;
  request.resolve(confirmed);
  chatStore.set(confirmRequestAtom, null);
}

export function ConfirmProvider() {
  const request = useAtomValue(confirmRequestAtom);

  return (
    <AlertDialog
      open={request != null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && (
            <AlertDialogDescription>
              {request.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {request?.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={request?.destructive ? "destructive" : "default"}
            onClick={() => settle(true)}
          >
            {request?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
