"use client";

import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  useConversationsInfiniteQuery,
  useDeleteConversationMutation,
} from "@/hooks/chat-hook";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LuLoader, LuSearch } from "react-icons/lu";
import { ConversationItem } from "./conversation-item";

export function ConversationList() {
  const t = useTranslations();
  const aui = useAui();
  const activeThreadId = useAuiState((s) => s.threadListItem.remoteId);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const conversationsQuery = useConversationsInfiniteQuery(
    debouncedSearch || undefined,
  );
  const deleteMutation = useDeleteConversationMutation();

  const conversations =
    conversationsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          conversationsQuery.hasNextPage &&
          !conversationsQuery.isFetchingNextPage
        ) {
          conversationsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    conversationsQuery.hasNextPage,
    conversationsQuery.isFetchingNextPage,
    conversationsQuery.fetchNextPage,
  ]);

  return (
    <SidebarGroup>
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
        <div className="mt-2 flex flex-col gap-1">
          {conversations.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-xs">
              {search ? t("CHAT.NO_RESULTS") : t("CHAT.NO_CONVERSATIONS")}
            </div>
          ) : (
            <>
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={conv.id === activeThreadId}
                  onSelect={() => aui.threads().switchToThread(conv.id)}
                  onDelete={async () => {
                    await deleteMutation.mutateAsync({ id: conv.id });
                    if (activeThreadId === conv.id)
                      aui.threads().switchToNewThread();
                  }}
                />
              ))}
              <div ref={sentinelRef} className="h-1" />
              {conversationsQuery.isFetchingNextPage && (
                <div className="flex items-center justify-center py-2">
                  <LuLoader className="text-muted-foreground h-4 w-4 animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
