"use client";

import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConversationsQuery,
  useDeleteConversationMutation,
} from "@/hooks/chat-hook";
import { selectedConversationAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuSearch } from "react-icons/lu";
import { ConversationItem } from "./conversation-item";

export function ConversationList() {
  const t = useTranslations();
  const [selectedId, setSelectedId] = useAtom(selectedConversationAtom);
  const [search, setSearch] = useState("");

  const conversationsQuery = useConversationsQuery();
  const deleteMutation = useDeleteConversationMutation();

  const conversations = conversationsQuery.data?.items ?? [];
  const filtered = search
    ? conversations.filter(
        (c) =>
          c.title?.toLowerCase().includes(search.toLowerCase()) ||
          c.model.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-0">{t("NAV.CHAT")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="relative">
          <LuSearch className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder={t("CHAT.SEARCH_PLACEHOLDER")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 text-xs"
          />
        </div>
        <SidebarMenu className="mt-2">
          {conversationsQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SidebarMenuItem key={i}>
                <Skeleton className="mx-2 h-12 rounded-md" />
              </SidebarMenuItem>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-xs">
              {search ? t("CHAT.NO_RESULTS") : t("CHAT.NO_CONVERSATIONS")}
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onSelect={() => setSelectedId(conv.id)}
                onDelete={() => {
                  deleteMutation.mutate(conv.id, {
                    onSuccess: () => {
                      if (selectedId === conv.id) setSelectedId(null);
                    },
                  });
                }}
              />
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
