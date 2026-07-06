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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatStore } from "@/store/chat-store";
import { atom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type AlertRequest = {
  kind: "input" | "select";
  text: string;
  options?: string[];
  resolve: (value: string) => void;
};

const alertRequestAtom = atom<AlertRequest | null>(null);

export function triggerAlert(
  kind: "normal" | "error" | "input" | "select",
  text: string,
  options?: string[],
): Promise<string> {
  if (kind === "normal") {
    toast.info(text);
    return Promise.resolve("");
  }
  if (kind === "error") {
    toast.error(text);
    return Promise.resolve("");
  }
  chatStore.get(alertRequestAtom)?.resolve("");
  return new Promise<string>((resolve) => {
    chatStore.set(alertRequestAtom, { kind, text, options, resolve });
  });
}

function settle(value: string) {
  const request = chatStore.get(alertRequestAtom);
  if (!request) return;
  request.resolve(value);
  chatStore.set(alertRequestAtom, null);
}

export function TriggerAlertProvider() {
  const t = useTranslations();
  const request = useAtomValue(alertRequestAtom);
  const [value, setValue] = useState("");

  return (
    <AlertDialog
      open={request != null}
      onOpenChange={(open) => {
        if (!open) {
          settle("");
          setValue("");
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.text}</AlertDialogTitle>
          {request?.kind === "select" && (
            <AlertDialogDescription>
              {t("CHAT.TRIGGER_ALERT_SELECT_DESC")}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {request?.kind === "input" && (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                settle(value);
                setValue("");
              }
            }}
          />
        )}
        {request?.kind === "select" && (
          <div className="flex flex-col gap-2">
            {(request.options ?? []).map((opt) => (
              <Button
                key={opt}
                variant="outline"
                className="justify-start"
                onClick={() => settle(opt)}
              >
                {opt}
              </Button>
            ))}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              settle("");
              setValue("");
            }}
          >
            {t("COMMON.CANCEL")}
          </AlertDialogCancel>
          {request?.kind === "input" && (
            <AlertDialogAction
              onClick={() => {
                settle(value);
                setValue("");
              }}
            >
              {t("CHAT.TRIGGER_ALERT_OK")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
