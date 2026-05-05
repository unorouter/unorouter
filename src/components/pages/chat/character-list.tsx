"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
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
  useCharactersQuery,
  useCreateCharacterMutation,
  useDeleteCharacterMutation,
  useImportCharacterCardMutation,
  useUpdateCharacterMutation,
} from "@/hooks/rp-hook";
import {
  characterFormSchema,
  type CharacterForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
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
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
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
                  className="hover:bg-accent flex flex-row cursor-pointer items-center gap-3 p-3 transition-colors"
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

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={
              props.createMut.isPending || props.updateMut.isPending
            }
          >
            {t("COMMON.SAVE")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
