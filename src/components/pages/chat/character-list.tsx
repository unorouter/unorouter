"use client";
/* eslint-disable react-hooks/set-state-in-effect -- form initialized when row clicked */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCharactersQuery,
  useCreateCharacterMutation,
  useDeleteCharacterMutation,
  useImportCharacterCardMutation,
  useUpdateCharacterMutation,
} from "@/hooks/rp-hook";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LuArrowLeft, LuPlus, LuTrash2, LuUpload } from "react-icons/lu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditorState = { mode: "list" } | { mode: "edit"; id?: string };

export function CharacterList(props: Props) {
  const t = useTranslations();
  const charsQuery = useCharactersQuery();
  const createMut = useCreateCharacterMutation();
  const updateMut = useUpdateCharacterMutation();
  const deleteMut = useDeleteCharacterMutation();
  const importMut = useImportCharacterCardMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<EditorState>({ mode: "list" });

  // Reset view when dialog closes
  useEffect(() => {
    if (!props.open) setView({ mode: "list" });
  }, [props.open]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await importMut.mutateAsync(file);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view.mode === "edit" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setView({ mode: "list" })}
              >
                <LuArrowLeft className="size-4" />
              </Button>
            )}
            {view.mode === "list"
              ? t("RP.CHARACTERS_TITLE")
              : view.id
                ? t("COMMON.EDIT")
                : t("RP.CHARACTERS_NEW")}
          </DialogTitle>
        </DialogHeader>

        {view.mode === "list" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,application/json"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMut.isPending}
              >
                <LuUpload className="size-4" />
                {t("RP.CHARACTERS_IMPORT")}
              </Button>
              <Button onClick={() => setView({ mode: "edit" })}>
                <LuPlus className="size-4" />
                {t("RP.CHARACTERS_NEW")}
              </Button>
            </div>

            {charsQuery.data?.length === 0 && (
              <Card className="text-muted-foreground py-10 text-center text-sm">
                {t("RP.CHARACTERS_EMPTY")}
              </Card>
            )}

            <div className="flex flex-col gap-2">
              {charsQuery.data?.map((c) => (
                <Card
                  key={c.id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-3 p-3 transition-colors"
                  onClick={() => setView({ mode: "edit", id: c.id })}
                >
                  {c.avatarR2Key ? (
                    <Image
                      src={`/r2/${c.avatarR2Key}`}
                      alt={c.name}
                      width={40}
                      height={40}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex size-10 items-center justify-center rounded-full text-sm">
                      {c.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {c.name}
                    </span>
                    {c.description && (
                      <span className="text-muted-foreground truncate text-xs">
                        {c.description}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
                      await deleteMut.mutateAsync(c.id);
                    }}
                  >
                    <LuTrash2 className="size-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <CharacterEditorInline
            characterId={view.id}
            onSaved={() => setView({ mode: "list" })}
            createMut={createMut}
            updateMut={updateMut}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type EditorInlineProps = {
  characterId?: string;
  onSaved: () => void;
  createMut: ReturnType<typeof useCreateCharacterMutation>;
  updateMut: ReturnType<typeof useUpdateCharacterMutation>;
};

function CharacterEditorInline(props: EditorInlineProps) {
  const t = useTranslations();
  const charsQuery = useCharactersQuery();
  const existing = props.characterId
    ? charsQuery.data?.find((c) => c.id === props.characterId)
    : undefined;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");
  const [scenario, setScenario] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [exampleMessages, setExampleMessages] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [postHistoryInstructions, setPostHistoryInstructions] = useState("");
  const [tags, setTags] = useState("");
  const [nsfw, setNsfw] = useState(false);
  // Seed once per characterId; later cache patches must not clobber typing.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    if (seededFor.current === existing.id) return;
    seededFor.current = existing.id;
    setName(existing.name ?? "");
    setDescription(existing.description ?? "");
    setPersonality(existing.personality ?? "");
    setScenario(existing.scenario ?? "");
    setFirstMessage(existing.firstMessage ?? "");
    setExampleMessages(existing.exampleMessages ?? "");
    setSystemPrompt(existing.systemPrompt ?? "");
    setPostHistoryInstructions(existing.postHistoryInstructions ?? "");
    setTags(Array.isArray(existing.tags) ? existing.tags.join(", ") : "");
    setNsfw(existing.nsfw ?? false);
  }, [existing]);

  const handleSave = async () => {
    const body = {
      name,
      description: description || undefined,
      personality: personality || undefined,
      scenario: scenario || undefined,
      firstMessage: firstMessage || undefined,
      exampleMessages: exampleMessages || undefined,
      systemPrompt: systemPrompt || undefined,
      postHistoryInstructions: postHistoryInstructions || undefined,
      tags: tags
        ? tags.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      nsfw,
    };
    if (props.characterId) {
      await props.updateMut.mutateAsync({ id: props.characterId, body });
    } else {
      await props.createMut.mutateAsync({ body });
    }
    props.onSaved();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_NAME")}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_DESCRIPTION")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_PERSONALITY")}</Label>
        <Textarea
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_SCENARIO")}</Label>
        <Textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_FIRST_MESSAGE")}</Label>
        <Textarea
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_EXAMPLE_MESSAGES")}</Label>
        <Textarea
          value={exampleMessages}
          onChange={(e) => setExampleMessages(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_SYSTEM_PROMPT")}</Label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_POST_HISTORY")}</Label>
        <Textarea
          value={postHistoryInstructions}
          onChange={(e) => setPostHistoryInstructions(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("RP.CHARACTER_TAGS")}</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="fantasy, adventure"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <Label>{t("RP.CHARACTER_NSFW")}</Label>
        <Switch checked={nsfw} onCheckedChange={setNsfw} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={
            !name || props.createMut.isPending || props.updateMut.isPending
          }
        >
          {t("COMMON.SAVE")}
        </Button>
      </div>
    </div>
  );
}
