"use client";

import { ModelSelector } from "@/components/elements/model/model-selector";
import { Icon } from "@/components/ui/icon";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useCharacterQuery } from "@/hooks/ai/rp/characters";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
} from "@/hooks/ai/rp/conversations";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { usePathname, useRouter } from "@/i18n/navigation";
import { NONE_VALUE } from "@/lib/config/constants";
import { formatPrice } from "@/lib/utils/format/number";
import {
  chatGroupAtom,
  chatModelAtom,
  conversationSettingsOpenAtom,
} from "@/store/chat-store";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useAtom, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Button } from "../../../ui/button";
import { ChatActionsMenu } from "./chat-actions-menu";

export function ChatControls() {
  const t = useTranslations();
  const [chatModel, setNewChatModel] = useAtom(chatModelAtom);
  const [chatGroup, setChatGroup] = useAtom(chatGroupAtom);
  const aui = useAui();
  const router = useRouter();
  const pathname = usePathname();

  const handleNewChat = () => {
    aui.threads().switchToNewThread();
    if (pathname !== "/chat") router.push("/chat");
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
      <div className="min-w-0 flex-1 sm:w-48 sm:flex-none lg:w-52">
        <ModelSelector
          value={chatModel}
          onChange={setNewChatModel}
          group={chatGroup}
          onGroupChange={setChatGroup}
        />
      </div>
      <Button
        size="sm"
        className="h-8 shrink-0 lg:px-3"
        onClick={handleNewChat}
        aria-label={t("CHAT.NEW_CONVERSATION")}
      >
        <Icon name="plus" className="h-3.5 w-3.5 lg:mr-1.5" />
        <span className="hidden lg:inline">{t("CHAT.NEW_CONVERSATION")}</span>
      </Button>
    </div>
  );
}

// Strip above the thread showing what's bound to THIS conversation; a chip click
// opens the overrides drawer. Hidden when nothing is bound.
export function ActiveConfigBadge() {
  const t = useTranslations();
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);
  const openSettings = useSetAtom(conversationSettingsOpenAtom);
  const settings = useChatSettingsQuery(threadId ?? undefined).data;
  const bindings = useChatBindingsQuery(threadId ?? undefined).data;
  const presets = usePresetsQuery().data;
  const personas = usePersonasQuery().data;

  if (!threadId || !settings) return null;

  const boundId = (id: string | null | undefined) =>
    id && id !== NONE_VALUE ? id : null;
  const presetName = presets?.find(
    (p) => p.id === boundId(settings.presetId),
  )?.name;
  const personaName = personas?.find(
    (p) => p.id === boundId(settings.personaId),
  )?.name;
  const characterCount = bindings?.characters?.length ?? 0;
  const lorebookCount = bindings?.lorebooks?.length ?? 0;

  type Chip = {
    icon: "sliders-horizontal" | "user" | "users" | "book-open";
    label: string;
  };
  const chips = [
    presetName && { icon: "sliders-horizontal", label: presetName },
    personaName && { icon: "user", label: personaName },
    characterCount > 0 && {
      icon: "users",
      label: t("CHAT.ACTIVE_CONFIG.CHARACTERS", { count: characterCount }),
    },
    lorebookCount > 0 && {
      icon: "book-open",
      label: t("CHAT.ACTIVE_CONFIG.LOREBOOKS", { count: lorebookCount }),
    },
  ].filter((c): c is Chip => Boolean(c));

  if (chips.length === 0) return null;

  return (
    <div className="thin-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto border-b px-2 py-1">
      {chips.map((chip) => (
        <button
          key={`${chip.icon}:${chip.label}`}
          type="button"
          onClick={() => openSettings(true)}
          className="bg-accent/60 text-muted-foreground hover:text-foreground hover:bg-accent inline-flex max-w-40 shrink-0 items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[11px] transition"
        >
          <Icon name={chip.icon} className="size-2.5 shrink-0" />
          <span className="truncate">{chip.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ConversationStats(props: { convId?: string }) {
  const t = useTranslations();
  const convQuery = useConversationQuery(props.convId);
  const data = convQuery.data;
  if (!props.convId || !data) return null;
  if (data.totalInputTokens <= 0 && data.totalOutputTokens <= 0) return null;
  return (
    <div className="text-muted-foreground pointer-events-none flex items-center justify-start gap-2 px-1 pb-1 text-[11px] tabular-nums">
      <span>
        {data.totalInputTokens.toLocaleString()} {t("CHAT.TOKENS_IN")}
      </span>
      <span>
        {data.totalOutputTokens.toLocaleString()} {t("CHAT.TOKENS_OUT")}
      </span>
      {data.totalCost > 0 && (
        <span className="text-foreground/70 font-medium">
          {formatPrice(data.totalCost)}
        </span>
      )}
    </div>
  );
}

// Primary character's background painted behind the thread, RisuAI style. Parent
// must be `relative isolate` so the -z-10 layers stay inside it.
export function CharacterBackground(props: { convId?: string }) {
  const bindings = useChatBindingsQuery(props.convId);
  const primary = (bindings.data?.characters ?? [])
    .filter((c) => c.isActive)
    .sort((a, b) => a.orderIndex - b.orderIndex)[0];
  const character = useCharacterQuery(primary?.characterId);
  const src = useMediaSrc(character.data?.backgroundMediaId);
  if (!src) return null;
  return (
    <>
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${src})` }}
      />
      {/* Readability scrim; thread bg goes transparent so the image shows. */}
      <div className="bg-background/55 absolute inset-0 -z-10" />
      <style>{".aui-thread-root{background-color:transparent}"}</style>
    </>
  );
}

export function ChatShareSlot() {
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);
  return (
    <div className="flex items-center gap-1">
      <ChatActionsMenu convId={threadId ?? null} />
    </div>
  );
}

export function NeedsTokenGate() {
  const t = useTranslations();
  const token = useApiKey();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <Icon name="key" className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-lg font-medium">
          {t("CHAT.GATE.NEEDS_TOKEN_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("CHAT.GATE.NEEDS_TOKEN_DESC")}
        </p>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        onClick={token.createToken}
        disabled={token.isLoading}
      >
        {token.isLoading ? (
          <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon name="plus" className="h-3.5 w-3.5" />
        )}
        {t("DOCS.GENERATE_API_KEY")}
      </Button>
    </div>
  );
}
