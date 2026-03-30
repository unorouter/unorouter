"use client";

import { Button } from "@/components/ui/button";
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
  useCreateConversationMutation,
  useDeleteConversationMutation,
} from "@/hooks/chat-hook";
import { selectedConversationAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuPlus, LuSearch } from "react-icons/lu";
import { ConversationItem } from "./conversation-item";
import { ModelSelector } from "./model-selector";

export function ConversationList() {
  const t = useTranslations();
  const [selectedId, setSelectedId] = useAtom(selectedConversationAtom);
  const [search, setSearch] = useState("");
  const [newChatModel, setNewChatModel] = useState("gpt-5.4-mini");

  const conversationsQuery = useConversationsQuery();
  const createMutation = useCreateConversationMutation();
  const deleteMutation = useDeleteConversationMutation();

  const conversations = conversationsQuery.data?.items ?? [];
  const filtered = search
    ? conversations.filter(
        (c) =>
          c.title?.toLowerCase().includes(search.toLowerCase()) ||
          c.model.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const handleNewChat = () => {
    createMutation.mutate(
      { model: newChatModel },
      {
        onSuccess: (data) => {
          setSelectedId(data.id);
        },
      },
    );
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t("NAV.CHAT")}</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-2 px-2">
            <ModelSelector value={newChatModel} onChange={setNewChatModel} />
            <Button
              className="w-full"
              size="sm"
              onClick={handleNewChat}
              disabled={createMutation.isPending}
            >
              <LuPlus className="mr-2 h-4 w-4" />
              {t("CHAT.NEW_CONVERSATION")}
            </Button>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2">
            <div className="relative">
              <LuSearch className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                placeholder={t("CHAT.SEARCH_PLACEHOLDER")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>
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
    </>
  );
}
