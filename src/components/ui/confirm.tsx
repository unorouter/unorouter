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

export type ConfirmChoice = "primary" | "alt" | false;

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** Second action beside the primary one, for a choice rather than a yes or no. */
  altLabel?: string;
  altDestructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (choice: ConfirmChoice) => void;
};

const confirmRequestAtom = atom<ConfirmRequest | null>(null);

function ask(options: ConfirmOptions): Promise<ConfirmChoice> {
  chatStore.get(confirmRequestAtom)?.resolve(false);
  return new Promise<ConfirmChoice>((resolve) => {
    chatStore.set(confirmRequestAtom, { ...options, resolve });
  });
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return ask(options).then((choice) => choice === "primary");
}

export function confirmChoice(options: ConfirmOptions): Promise<ConfirmChoice> {
  return ask(options);
}

function settle(choice: ConfirmChoice) {
  const request = chatStore.get(confirmRequestAtom);
  if (!request) return;
  request.resolve(choice);
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
          {request?.altLabel && (
            <AlertDialogAction
              variant={request.altDestructive ? "destructive" : "outline"}
              onClick={() => settle("alt")}
            >
              {request.altLabel}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            variant={request?.destructive ? "destructive" : "default"}
            onClick={() => settle("primary")}
          >
            {request?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
