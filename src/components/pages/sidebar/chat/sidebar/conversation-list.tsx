"use client";

import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  useChatGroupsQuery,
  useConversationsInfiniteQuery,
  useCreateChatGroupMutation,
  useDeleteConversationMutation,
  useDeleteConversationsMutation,
  useToggleChatGroupFoldedMutation,
} from "@/hooks/ai/chat-hook";
import { confirm } from "@/components/ui/confirm";
import { analytics } from "@/lib/analytics";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buildGroupTree,
  type GroupNode,
} from "@/lib/db/client/data/chat/group-tree";
import { ConversationItem } from "./conversation-item";
import { ChatGroupSection } from "./chat-group-section";

export function ConversationList() {
  const t = useTranslations();
  const aui = useAui();
  const sidebar = useSidebar();
  const activeThreadId = useAuiState((s) => s.threadListItem.remoteId);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const conversationsQuery = useConversationsInfiniteQuery(
    debouncedSearch || undefined,
  );
  const deleteMutation = useDeleteConversationMutation();
  const deleteManyMutation = useDeleteConversationsMutation();
  const groupsQuery = useChatGroupsQuery();
  const createGroup = useCreateChatGroupMutation();
  const toggleFolded = useToggleChatGroupFoldedMutation();

  const conversations =
    conversationsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const groups = groupsQuery.data ?? [];
  const grouped = !debouncedSearch && groups.length > 0;

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

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDeleteSelected = async () => {
    const ids = [...(selectedIds ?? [])];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: t("CHAT.DELETE_SELECTED_TITLE"),
      description: t("CHAT.DELETE_SELECTED_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await deleteManyMutation.mutateAsync({ ids });
    if (activeThreadId && ids.includes(activeThreadId))
      aui.threads().switchToNewThread();
    setSelectedIds(null);
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

  const renderItem = (conv: (typeof conversations)[number]) => (
    <ConversationItem
      key={conv.id}
      conversation={conv}
      isSelected={conv.id === activeThreadId}
      onSelect={() => handleSelect(conv.id)}
      onDelete={() => handleDelete(conv.id)}
      selection={
        selectedIds
          ? {
              checked: selectedIds.has(conv.id),
              onToggle: () => toggleSelected(conv.id),
            }
          : undefined
      }
    />
  );

  const ungrouped = conversations.filter((c) => !c.groupId);

  const subtreeCount = (node: GroupNode): number =>
    conversations.filter((c) => c.groupId === node.group.id).length +
    node.children.reduce((sum, child) => sum + subtreeCount(child), 0);

  const renderGroup = (node: GroupNode, depth: number): ReactNode => {
    const items = conversations.filter((c) => c.groupId === node.group.id);
    return (
      <ChatGroupSection
        key={node.group.id}
        group={node.group}
        depth={depth}
        count={subtreeCount(node)}
        onToggle={() =>
          toggleFolded.mutate({ id: node.group.id, folded: !node.group.folded })
        }
      >
        {node.children.map((child) => renderGroup(child, depth + 1))}
        {items.length === 0 && node.children.length === 0 ? (
          <div className="text-muted-foreground px-2 py-1 text-xs">
            {t("CHAT.GROUPS.EMPTY")}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </ChatGroupSection>
    );
  };

  const conversationItems = (
    <div className="flex flex-col gap-1">
      {conversationsQuery.isPending ? (
        Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))
      ) : conversations.length === 0 ? (
        <div className="text-muted-foreground p-4 text-center text-xs">
          {search ? t("CHAT.NO_RESULTS") : t("CHAT.NO_CONVERSATIONS")}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1">
            {!debouncedSearch ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 justify-start gap-1.5 px-2 text-xs"
                onClick={() =>
                  createGroup.mutate({ name: t("CHAT.GROUPS.GROUP_UNTITLED") })
                }
              >
                <Icon name="plus-circle" className="size-3.5" />
                {t("CHAT.GROUPS.NEW_GROUP")}
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 gap-1.5 px-2 text-xs"
              onClick={() => setSelectedIds(selectedIds ? null : new Set())}
            >
              {selectedIds ? t("COMMON.CANCEL") : t("CHAT.SELECT")}
            </Button>
          </div>

          {selectedIds && (
            <div className="flex items-center justify-between gap-1 px-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 px-1 text-xs"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.size === conversations.length
                      ? new Set()
                      : new Set(conversations.map((c) => c.id)),
                  )
                }
              >
                {selectedIds.size === conversations.length
                  ? t("CHAT.SELECT_NONE")
                  : t("CHAT.SELECT_ALL")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={
                  selectedIds.size === 0 || deleteManyMutation.isPending
                }
                onClick={handleDeleteSelected}
              >
                {t("CHAT.DELETE_SELECTED", { count: selectedIds.size })}
              </Button>
            </div>
          )}

          {grouped &&
            buildGroupTree(groups).map((node) => renderGroup(node, 1))}

          {ungrouped.map(renderItem)}

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
        <SectionBoundary source="chat.conversation_list">
          {conversationItems}
        </SectionBoundary>
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
