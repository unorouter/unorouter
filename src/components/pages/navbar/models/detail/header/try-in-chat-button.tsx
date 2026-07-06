"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useRouter } from "@/i18n/navigation";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { setCookie } from "cookies-next";

type Props = {
  modelName: string;
  label: string;
  loginLabel: string;
  className?: string;
  icon?: boolean;
  badge?: boolean;
  disabled?: boolean;
};

export function TryInChatButton(props: Props) {
  const router = useRouter();
  const authQuery = useAuthQuery();
  const setChatModel = useSetAtom(chatModelAtom);
  const isLoggedIn = !!authQuery.data;

  function handleClick() {
    setChatModel(props.modelName);
    if (isLoggedIn) {
      router.push("/chat");
    } else {
      setCookie(AUTH_REDIRECT_COOKIE, "/chat", { maxAge: 300 });
      router.push("/login");
    }
  }

  const text = isLoggedIn ? props.label : props.loginLabel;

  if (props.badge) {
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
          props.className,
        )}
      >
        {props.icon && <Icon name="message-square" className="size-3" />}
        {text}
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={props.disabled}
      className={props.className}
    >
      {props.icon && <Icon name="message-square" className="h-3.5 w-3.5" />}
      {text}
    </Button>
  );
}
