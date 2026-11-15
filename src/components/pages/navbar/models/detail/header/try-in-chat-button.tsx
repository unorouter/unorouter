"use client";

import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { useRouter } from "@/i18n/navigation";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { chooseChatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { setCookie } from "cookies-next";

export function TryInChatButton(props: {
  modelName: string;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const authQuery = useAuthQuery();
  const setChatModel = useSetAtom(chooseChatModelAtom);
  const hydrated = useHydrated();
  const isLoggedIn = hydrated && !!authQuery.data;

  function handleClick() {
    setChatModel(props.modelName);
    if (isLoggedIn) {
      router.push("/chat");
    } else {
      setCookie(AUTH_REDIRECT_COOKIE, "/chat", { maxAge: 300 });
      router.push("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={props.disabled}
      className={cn(
        "border-border bg-muted/40 inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors",
        props.disabled
          ? "text-muted-foreground cursor-not-allowed opacity-50"
          : "hover:bg-muted",
      )}
    >
      <Icon name="message-square" className="size-3" />
      {props.label}
    </button>
  );
}
