"use client";
/* eslint-disable react-hooks/set-state-in-effect -- form state initialized from async server query when data arrives */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
  useCharactersQuery,
  useLorebooksQuery,
  usePersonasQuery,
  usePresetsQuery,
  useUpdateChatBindingsMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/rp-hook";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LuSettings2 } from "react-icons/lu";

type DrawerProps = {
  convId: string;
  trigger?: React.ReactElement;
};

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
  const settingsQuery = useChatSettingsQuery(props.convId);
  const bindingsQuery = useChatBindingsQuery(props.convId);
  const charactersQuery = useCharactersQuery();
  const personasQuery = usePersonasQuery();
  const lorebooksQuery = useLorebooksQuery();
  const presetsQuery = usePresetsQuery();

  const updateSettings = useUpdateChatSettingsMutation();
  const updateBindings = useUpdateChatBindingsMutation();

  const settings = settingsQuery.data;
  const bindings = bindingsQuery.data;

  // Local state, initialized from server snapshot.
  const [chatMemory, setChatMemory] = useState(8);
  const [authorNoteDepth, setAuthorNoteDepth] = useState(4);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [authorNote, setAuthorNote] = useState("");
  const [personaId, setPersonaId] = useState<string>("__none__");
  const [presetId, setPresetId] = useState<string>("__none__");
  const [reasoningEffort, setReasoningEffort] = useState<string>("__none__");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webSearchEngine, setWebSearchEngine] = useState("auto");
  const [webSearchContextSize, setWebSearchContextSize] = useState("medium");
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [lorebookIds, setLorebookIds] = useState<string[]>([]);
  // Seed once per convId; cache patches must not clobber unsaved edits.
  const settingsSeededFor = useRef<string | null>(null);
  const bindingsSeededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    if (settingsSeededFor.current === props.convId) return;
    settingsSeededFor.current = props.convId;
    setChatMemory(settings.chatMemory ?? 8);
    setAuthorNoteDepth(settings.authorNoteDepth ?? 4);
    setSystemPrompt(settings.systemPromptOverride ?? "");
    setAuthorNote(settings.authorNote ?? "");
    setPersonaId(settings.personaId ?? "__none__");
    setPresetId(settings.presetId ?? "__none__");
    setReasoningEffort(settings.reasoningEffort ?? "__none__");
    setWebSearchEnabled(settings.webSearchEnabled ?? false);
    setWebSearchEngine(settings.webSearchEngine ?? "auto");
    setWebSearchContextSize(settings.webSearchContextSize ?? "medium");
  }, [settings, props.convId]);

  useEffect(() => {
    if (!bindings) return;
    if (bindingsSeededFor.current === props.convId) return;
    bindingsSeededFor.current = props.convId;
    setCharacterIds(bindings.characters.map((c) => c.characterId));
    setLorebookIds(bindings.lorebooks.map((l) => l.lorebookId));
  }, [bindings, props.convId]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      convId: props.convId,
      body: {
        chatMemory,
        authorNoteDepth,
        systemPromptOverride: systemPrompt || null,
        authorNote: authorNote || null,
        personaId: personaId === "__none__" ? null : personaId,
        presetId: presetId === "__none__" ? null : presetId,
        reasoningEffort:
          reasoningEffort === "__none__"
            ? null
            : (reasoningEffort as
                | "xhigh"
                | "high"
                | "medium"
                | "low"
                | "minimal"
                | "none"),
        webSearchEnabled,
        webSearchEngine: webSearchEngine as
          | "auto"
          | "native"
          | "exa"
          | "tavily",
        webSearchContextSize: webSearchContextSize as "low" | "medium" | "high",
      },
    });
    await updateBindings.mutateAsync({
      convId: props.convId,
      body: {
        characters: characterIds.map((id, i) => ({
          characterId: id,
          orderIndex: i,
          isActive: true,
        })),
        lorebookIds,
      },
    });
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          props.trigger ?? (
            <Button variant="ghost" size="icon" aria-label={t("CHAT.OVERRIDES.OPEN")}>
              <LuSettings2 className="size-4" />
            </Button>
          )
        }
      />
      <SheetContent className="overflow-y-auto overflow-x-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("CHAT.OVERRIDES.TITLE")}</SheetTitle>
          <SheetDescription>
            {t("CHAT.OVERRIDES.DESCRIPTION")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4">
          {/* Persona */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.PERSONA")}</Label>
            <Select value={personaId} onValueChange={(v) => setPersonaId(v ?? "__none__")}>
              <SelectTrigger>
                <SelectValue>
                  {personaId === "__none__"
                    ? t("CHAT.OVERRIDES.NONE")
                    : personasQuery.data?.find((p) => p.id === personaId)?.name ??
                      t("CHAT.OVERRIDES.NONE")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("CHAT.OVERRIDES.NONE")}
                </SelectItem>
                {personasQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Characters (multi-select via checkbox-y rows) */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.CHARACTERS")}</Label>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2">
              {charactersQuery.data?.length === 0 && (
                <span className="text-muted-foreground text-xs">
                  {t("CHAT.OVERRIDES.NO_CHARACTERS")}
                </span>
              )}
              {charactersQuery.data?.map((c) => {
                const checked = characterIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setCharacterIds(
                          checked
                            ? characterIds.filter((id) => id !== c.id)
                            : [...characterIds, c.id],
                        );
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Lorebooks */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.LOREBOOKS")}</Label>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2">
              {lorebooksQuery.data?.length === 0 && (
                <span className="text-muted-foreground text-xs">
                  {t("CHAT.OVERRIDES.NO_LOREBOOKS")}
                </span>
              )}
              {lorebooksQuery.data?.map((l) => {
                const checked = lorebookIds.includes(l.id);
                return (
                  <label
                    key={l.id}
                    className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setLorebookIds(
                          checked
                            ? lorebookIds.filter((id) => id !== l.id)
                            : [...lorebookIds, l.id],
                        );
                      }}
                    />
                    <span>{l.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sampling preset */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.PRESET")}</Label>
            <Select value={presetId} onValueChange={(v) => setPresetId(v ?? "__none__")}>
              <SelectTrigger>
                <SelectValue>
                  {presetId === "__none__"
                    ? t("CHAT.OVERRIDES.NONE")
                    : presetsQuery.data?.find((p) => p.id === presetId)?.name ??
                      t("CHAT.OVERRIDES.NONE")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("CHAT.OVERRIDES.NONE")}
                </SelectItem>
                {presetsQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reasoning effort */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.REASONING_EFFORT")}</Label>
            <Select value={reasoningEffort} onValueChange={(v) => setReasoningEffort(v ?? "__none__")}>
              <SelectTrigger>
                <SelectValue>
                  {reasoningEffort === "__none__"
                    ? t("CHAT.OVERRIDES.MODEL_DEFAULT")
                    : reasoningEffort === "none"
                      ? t("CHAT.OVERRIDES.OFF")
                      : reasoningEffort.charAt(0).toUpperCase() + reasoningEffort.slice(1)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("CHAT.OVERRIDES.MODEL_DEFAULT")}
                </SelectItem>
                <SelectItem value="none">{t("CHAT.OVERRIDES.OFF")}</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="xhigh">XHigh</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chat memory */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>{t("CHAT.OVERRIDES.CHAT_MEMORY")}</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {chatMemory}
              </span>
            </div>
            <Slider
              min={1}
              max={200}
              value={[chatMemory]}
              onValueChange={(v) =>
                setChatMemory(Array.isArray(v) ? v[0] : v)
              }
            />
            <span className="text-muted-foreground text-xs">
              {t("CHAT.OVERRIDES.CHAT_MEMORY_HINT")}
            </span>
          </div>

          {/* System prompt override */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.SYSTEM_PROMPT")}</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t("CHAT.OVERRIDES.SYSTEM_PROMPT_PLACEHOLDER")}
              rows={4}
            />
          </div>

          {/* Author's note */}
          <div className="flex flex-col gap-2">
            <Label>{t("CHAT.OVERRIDES.AUTHOR_NOTE")}</Label>
            <Textarea
              value={authorNote}
              onChange={(e) => setAuthorNote(e.target.value)}
              placeholder={t("CHAT.OVERRIDES.AUTHOR_NOTE_PLACEHOLDER")}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {t("CHAT.OVERRIDES.AUTHOR_NOTE_DEPTH")}
              </span>
              <Input
                type="number"
                min={0}
                max={50}
                value={authorNoteDepth}
                onChange={(e) =>
                  setAuthorNoteDepth(Number(e.target.value) || 0)
                }
                className="w-20"
              />
            </div>
          </div>

          {/* Web search */}
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label>{t("CHAT.OVERRIDES.WEB_SEARCH")}</Label>
              <Switch
                checked={webSearchEnabled}
                onCheckedChange={setWebSearchEnabled}
              />
            </div>
            {webSearchEnabled && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    {t("CHAT.OVERRIDES.WEB_SEARCH_ENGINE")}
                  </span>
                  <Select
                    value={webSearchEngine}
                    onValueChange={(v) => setWebSearchEngine(v ?? "auto")}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {webSearchEngine.charAt(0).toUpperCase() +
                          webSearchEngine.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="tavily">Tavily</SelectItem>
                      <SelectItem value="exa">Exa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    {t("CHAT.OVERRIDES.WEB_SEARCH_CONTEXT_SIZE")}
                  </span>
                  <Select
                    value={webSearchContextSize}
                    onValueChange={(v) => setWebSearchContextSize(v ?? "medium")}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {webSearchContextSize.charAt(0).toUpperCase() +
                          webSearchContextSize.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending || updateBindings.isPending}
          >
            {t("COMMON.SAVE")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
