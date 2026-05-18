"use client";

import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  useConversationsInfiniteQuery,
  useDeleteConversationMutation,
} from "@/hooks/chat-hook";
import { analytics } from "@/lib/analytics";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ConversationItem } from "./conversation-item";

export function ConversationList() {
  const t = useTranslations();
  const aui = useAui();
  const sidebar = useSidebar();
  const activeThreadId = useAuiState((s) => s.threadListItem.remoteId);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!debouncedSearch) return;
    if (conversationsQuery.isLoading || conversationsQuery.isFetching) return;
    analytics.chat.conversationListSearched({
      query_length: debouncedSearch.length,
      has_results: conversations.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, conversationsQuery.isLoading]);

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
          analytics.chat.conversationListPaginated();
          conversationsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversationsQuery.hasNextPage,
    conversationsQuery.isFetchingNextPage,
    conversationsQuery.fetchNextPage,
  ]);

  const handleSelect = (id: string) => {
    analytics.chat.conversationSelected({
      from: popoverOpen ? "popover" : "list",
    });
    aui.threads().switchToThread(id);
    setPopoverOpen(false);
    if (sidebar.isMobile) sidebar.setOpenMobile(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    if (activeThreadId === id) aui.threads().switchToNewThread();
  };

  const searchInput = (
    <div className="relative">
      <Icon
        name="search"
        className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
      />
      <Input
        placeholder={t("CHAT.SEARCH_PLACEHOLDER")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 truncate pl-9 text-xs"
      />
    </div>
  );

  const conversationItems = (
    <div className="flex flex-col gap-1">
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
              onSelect={() => handleSelect(conv.id)}
              onDelete={() => handleDelete(conv.id)}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {conversationsQuery.isFetchingNextPage && (
            <div className="flex items-center justify-center py-2">
              <Icon
                name="loader"
                className="text-muted-foreground h-4 w-4 animate-spin"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  const listContent = (
    <>
      {searchInput}
      <div className="mt-2">
        <SectionBoundary>{conversationItems}</SectionBoundary>
      </div>
    </>
  );

  if (sidebar.state === "collapsed") {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger
                  render={
                    <SidebarMenuButton tooltip={t("CHAT.SEARCH_CHATS")} />
                  }
                >
                  <Icon name="search" className="size-4" />
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-72 p-2">
                  {listContent}
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="shrink-0">
        <SidebarGroupContent>{searchInput}</SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <SidebarGroupContent>{conversationItems}</SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
