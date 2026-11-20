"use client";

import { RpAvatar } from "@/components/pages/sidebar/chat/rp/shared/rp-list-parts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useChatSettingsQuery,
  useUpdateChatSettingsMutation,
} from "@/hooks/ai/rp/conversations";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import {
  extraPersonaIds,
  personaIdsColumn,
} from "@/lib/db/conversation-settings";
import { chatLoadoutAtom } from "@/store/chat-store";
import { useAuiState } from "@assistant-ui/react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";

// Switching keeps the previous persona in the chat, so its description stays in
// the prompt for the turns it already wrote.
export function ComposerPersonaSwitcher() {
  const t = useTranslations();
  const convId = useAuiState((s) => s.threadListItem?.remoteId);
  const personas = usePersonasQuery().data ?? [];
  const settings = useChatSettingsQuery(convId ?? undefined).data;
  const updateSettings = useUpdateChatSettingsMutation();
  const [loadout, setLoadout] = useAtom(chatLoadoutAtom);
  if (personas.length < 2) return null;

  const activeId = convId ? (settings?.personaId ?? null) : loadout.personaId;
  const inChat = new Set([
    ...(activeId ? [activeId] : []),
    ...(settings ? extraPersonaIds(settings) : []),
  ]);
  const ordered = [
    ...personas.filter((p) => inChat.has(p.id)),
    ...personas.filter((p) => !inChat.has(p.id)),
  ];
  const active = personas.find((p) => p.id === activeId);

  const select = (id: string) => {
    if (id === activeId) return;
    setLoadout({ ...loadout, personaId: id });
    if (!convId) return;
    const extras = [...inChat].filter((p) => p !== id);
    updateSettings.mutate({
      convId,
      body: { personaId: id, personaIds: personaIdsColumn(extras) },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("CHAT.PERSONA_SWITCH.SPEAK_AS")}
            title={t("CHAT.PERSONA_SWITCH.SPEAK_AS")}
            className="aui-composer-persona size-8 rounded-full"
          />
        }
      >
        {active ? (
          <RpAvatar
            mediaId={active.avatarMediaId}
            name={active.title || active.name}
            className="size-6"
          />
        ) : (
          <Icon name="user" className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuRadioGroup value={activeId ?? ""} onValueChange={select}>
          {ordered.map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id}>
              <span className="flex min-w-0 items-center gap-2">
                <RpAvatar
                  mediaId={p.avatarMediaId}
                  name={p.title || p.name}
                  className="size-5"
                />
                <span className="truncate">{p.title || p.name}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
