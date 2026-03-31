"use client";

import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { ConversationList } from "./sidebar/conversation-list";

type Props = {
  children: React.ReactNode;
};

export function ChatSidebarLayout(props: Props) {
  return (
    <SidebarLayout navConfig="chat" chatContent={<ConversationList />}>
      {props.children}
    </SidebarLayout>
  );
}
