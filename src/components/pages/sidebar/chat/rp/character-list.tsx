"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCharactersQuery,
  useCreateCharacterMutation,
  useDeleteCharacterMutation,
  useImportCharacterCardMutation,
  useUpdateCharacterMutation,
} from "@/hooks/ai/rp/characters";
import {
  characterFormSchema,
  type CharacterForm,
} from "@/lib/validation/rp-forms";
import { analytics } from "@/lib/analytics";
import { rpc } from "@/lib/rpc";
import { downloadBlob } from "@/lib/utils/client";
import type { EditorState } from "@/lib/types";
import type { CharacterExportFormat } from "@/lib/validation/rp";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMediaSrc } from "@/hooks/ai/use-media-src";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterList(props: Props) {
  const t = useTranslations();
  const charsQuery = useCharactersQuery();
  const createMut = useCreateCharacterMutation();
  const updateMut = useUpdateCharacterMutation();
  const deleteMut = useDeleteCharacterMutation();
  const importMut = useImportCharacterCardMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<EditorState>({ mode: "list" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setView({ mode: "list" });
  }, [props.open]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      await importMut.mutateAsync(file);
      analytics.rp.entityAction({ entity: "character", action: "imported" });
    } catch {
      analytics.rp.entityAction({
        entity: "character",
        action: "import_failed",
      });
    }
  };

  const handleExport = async (id: string, format: CharacterExportFormat) => {
    const { response, error } = await rpc.api.ai.rp
      .characters({ id })
      .export.get({ query: { format } });
    if (error || !response.ok) return;
    const blob = await response.blob();
    const fname =
      response.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `character-${id}.${format}`;
    downloadBlob(blob, fname);
    analytics.rp.entityAction({
      entity: "character",
      action: "exported",
      format,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view.mode === "edit" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setView({ mode: "list" })}
              >
                <Icon name="arrow-left" className="size-4" />
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,application/json"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "character",
                    action: "import_picker_opened",
                  });
                  fileInputRef.current?.click();
                }}
                disabled={importMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="upload" className="size-4" />
                <span className="truncate">{t("RP.CHARACTERS_IMPORT")}</span>
              </Button>
              <Button
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "character",
                    action: "create_started",
                  });
                  setView({ mode: "edit" });
                }}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="plus" className="size-4" />
                <span className="truncate">{t("RP.CHARACTERS_NEW")}</span>
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
                  className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
                  onClick={() => {
                    analytics.rp.entityAction({
                      entity: "character",
                      action: "edit_started",
                    });
                    setView({ mode: "edit", id: c.id });
                  }}
                >
                  <CharacterAvatar
                    mediaId={c.avatarMediaId}
                    name={c.name}
                  />

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
                  <div onClick={(e) => e.stopPropagation()}>
                    <SyncBadge
                      kind="characters"
                      id={c.id}
                      payload={c}
                      compact
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("RP.CHARACTERS_EXPORT")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <Icon name="download" className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onClick={() => handleExport(c.id, "png")}
                      >
                        {t("RP.EXPORT_PNG")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(c.id, "json")}
                      >
                        {t("RP.EXPORT_JSON")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(c.id, "charx")}
                      >
                        {t("RP.EXPORT_CHARX")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: t("COMMON.CONFIRM.DELETE_CHARACTER_TITLE"),
                        description: t("COMMON.CONFIRM.DELETE_CHARACTER_DESC"),
                        confirmLabel: t("COMMON.DELETE"),
                        cancelLabel: t("COMMON.CANCEL"),
                        destructive: true,
                      });
                      if (!ok) return;
                      await deleteMut.mutateAsync(c.id);
                      analytics.rp.entityAction({
                        entity: "character",
                        action: "deleted",
                      });
                    }}
                  >
                    <Icon name="trash-2" className="size-4" />
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

  const form = useForm({
    resolver: typeboxResolver(characterFormSchema),
    defaultValues: Value.Default(characterFormSchema, {}) as CharacterForm,
  });

  useEffect(() => {
    if (!existing) {
      form.reset(Value.Default(characterFormSchema, {}) as CharacterForm);
      return;
    }
    form.reset({
      name: existing.name ?? "",
      description: existing.description ?? "",
      personality: existing.personality ?? "",
      scenario: existing.scenario ?? "",
      firstMessage: existing.firstMessage ?? "",
      exampleMessages: existing.exampleMessages ?? "",
      systemPrompt: existing.systemPrompt ?? "",
      postHistoryInstructions: existing.postHistoryInstructions ?? "",
      tags: Array.isArray(existing.tags) ? existing.tags.join(", ") : "",
      nsfw: existing.nsfw ?? false,
      triggers: Array.isArray(existing.triggers)
        ? existing.triggers.join(", ")
        : "",
      alwaysActive: existing.alwaysActive ?? true,
      matchWholeWords: existing.matchWholeWords ?? false,
    });
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const onSubmit = async (data: CharacterForm) => {
    const body = {
      name: data.name,
      description: data.description || undefined,
      personality: data.personality || undefined,
      scenario: data.scenario || undefined,
      firstMessage: data.firstMessage || undefined,
      exampleMessages: data.exampleMessages || undefined,
      systemPrompt: data.systemPrompt || undefined,
      postHistoryInstructions: data.postHistoryInstructions || undefined,
      tags: data.tags
        ? data.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      nsfw: data.nsfw,
      triggers: data.triggers
        ? data.triggers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      alwaysActive: data.alwaysActive,
      matchWholeWords: data.matchWholeWords,
    };
    if (props.characterId) {
      await props.updateMut.mutateAsync({ id: props.characterId, body });
    } else {
      await props.createMut.mutateAsync({ body });
    }
    props.onSaved();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <MyFormInput
          control={form.control}
          name="name"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_NAME")}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_DESCRIPTION")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="personality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_PERSONALITY")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scenario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_SCENARIO")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="firstMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_FIRST_MESSAGE")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="exampleMessages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_EXAMPLE_MESSAGES")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_SYSTEM_PROMPT")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postHistoryInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("RP.CHARACTER_POST_HISTORY")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
            </FormItem>
          )}
        />
        <MyFormInput
          control={form.control}
          name="tags"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_TAGS")}
          placeholder="fantasy, adventure"
        />
        <MyFormSwitch
          control={form.control}
          name="nsfw"
          label={t("RP.CHARACTER_NSFW")}
        />

        <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-medium tracking-wide uppercase">
            {t("RP.CHARACTER_ACTIVATION_TITLE")}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("RP.CHARACTER_ACTIVATION_HINT")}
          </p>
          <div className="flex flex-col gap-1">
            <MyFormSwitch
              control={form.control}
              name="alwaysActive"
              label={t("RP.CHARACTER_ALWAYS_ACTIVE")}
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.CHARACTER_ALWAYS_ACTIVE_HINT")}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <MyFormInput
              control={form.control}
              name="triggers"
              schema={characterFormSchema}
              label={t("RP.CHARACTER_TRIGGERS")}
              placeholder="alice, knight, sword"
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.CHARACTER_TRIGGERS_HINT")}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <MyFormSwitch
              control={form.control}
              name="matchWholeWords"
              label={t("RP.CHARACTER_MATCH_WHOLE_WORDS")}
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.CHARACTER_MATCH_WHOLE_WORDS_HINT")}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={props.createMut.isPending || props.updateMut.isPending}
          >
            {t("COMMON.SAVE")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CharacterAvatar(props: { mediaId: string | null; name: string }) {
  const src = useMediaSrc(props.mediaId);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={props.name}
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="bg-muted flex size-10 items-center justify-center rounded-full text-sm">
      {props.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
