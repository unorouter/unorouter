"use client";

import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useRouter } from "@/i18n/navigation";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { chatModelAtom } from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { setCookie } from "cookies-next";

type Props = {
  modelName: string;
  label: string;
  loginLabel: string;
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

  return (
    <Button onClick={handleClick}>
      {isLoggedIn ? props.label : props.loginLabel}
    </Button>
  );
}
