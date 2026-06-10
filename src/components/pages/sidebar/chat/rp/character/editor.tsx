"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  useCharacterQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
} from "@/hooks/ai/rp/characters";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { upsertLocalMedia } from "@/lib/db/client/data/media";
import {
  characterFormSchema,
  type CharacterForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { csvToArray, uid } from "@/lib/utils/base";
import { fileToScaledDataUrl, splitDataUrl } from "@/lib/utils/client";
import { formDefaults } from "@/lib/validation/helpers";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

type Props = {
  characterId?: string;
  onSaved: () => void;
};

// Background image edit state: keep existing, remove, or replace with new bytes.
type BgDraft =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "new"; dataUrl: string };

export function CharacterEditor(props: Props) {
  const t = useTranslations();
  const auth = useAuthQuery();
  const characterQuery = useCharacterQuery(props.characterId);
  const createMut = useCreateCharacterMutation();
  const updateMut = useUpdateCharacterMutation();
  const existing = characterQuery.data;
  const [bgDraft, setBgDraft] = useState<BgDraft>({ kind: "keep" });
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const existingBgSrc = useMediaSrc(
    bgDraft.kind === "keep" ? existing?.backgroundMediaId : null,
  );
  const bgPreview =
    bgDraft.kind === "new"
      ? bgDraft.dataUrl
      : bgDraft.kind === "keep"
        ? existingBgSrc
        : null;

  // `values` syncs the row on settle; keepDirtyValues protects in-progress
  // typing. tags/triggers are string[] columns edited comma-joined.
  const formValues = existing
    ? formDefaults(characterFormSchema, {
        ...existing,
        tags: Array.isArray(existing.tags) ? existing.tags.join(", ") : "",
        triggers: Array.isArray(existing.triggers)
          ? existing.triggers.join(", ")
          : "",
      })
    : undefined;
  const form = useForm({
    resolver: typeboxResolver(characterFormSchema),
    defaultValues: formDefaults(characterFormSchema),
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });

  const pickBgFile = async (file: File) => {
    const dataUrl = await fileToScaledDataUrl(file);
    setBgDraft({ kind: "new", dataUrl });
  };

  // Media row is only written on save so an abandoned edit leaves no orphan.
  const resolveBackgroundMediaId = async (): Promise<string | null> => {
    if (bgDraft.kind === "remove") return null;
    if (bgDraft.kind === "keep") return existing?.backgroundMediaId ?? null;
    const parts = splitDataUrl(bgDraft.dataUrl);
    if (!parts) return existing?.backgroundMediaId ?? null;
    const userId = auth.data?.id ?? GUEST_USER_ID;
    const mediaId = uid();
    await upsertLocalMedia(userId, {
      id: mediaId,
      convId: null,
      mimeType: parts.mimeType,
      sizeBytes: Math.floor((parts.base64.length * 3) / 4),
      dataBase64: parts.base64,
    });
    return mediaId;
  };

  const onSubmit = async (data: CharacterForm) => {
    const body = {
      ...data,
      // tags/triggers go back to string[] columns.
      tags: csvToArray(data.tags),
      triggers: csvToArray(data.triggers),
      backgroundMediaId: await resolveBackgroundMediaId(),
    };
    if (props.characterId) {
      await updateMut.mutateAsync({ id: props.characterId, body });
    } else {
      await createMut.mutateAsync({ body });
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

        <MyFormTextarea
          control={form.control}
          name="description"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_DESCRIPTION")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="personality"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_PERSONALITY")}
          rows={3}
        />
        <MyFormTextarea
          control={form.control}
          name="scenario"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_SCENARIO")}
          rows={3}
        />
        <MyFormTextarea
          control={form.control}
          name="firstMessage"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_FIRST_MESSAGE")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="exampleMessages"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_EXAMPLE_MESSAGES")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="systemPrompt"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_SYSTEM_PROMPT")}
          rows={4}
        />
        <MyFormTextarea
          control={form.control}
          name="postHistoryInstructions"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_POST_HISTORY")}
          rows={3}
        />
        <MyFormInput
          control={form.control}
          name="tags"
          schema={characterFormSchema}
          label={t("RP.CHARACTER_TAGS")}
          placeholder="fantasy, adventure"
        />
        <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-medium tracking-wide uppercase">
            {t("RP.CHARACTER_BACKGROUND")}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("RP.CHARACTER_BACKGROUND_HINT")}
          </p>
          {bgPreview && (
            <div className="border-border/40 relative h-28 w-full overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, next/image can't optimize it */}
              <img
                src={bgPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => bgFileInputRef.current?.click()}
            >
              <Icon name="upload" className="mr-1.5 size-3.5" />
              {bgPreview ? t("THEME.BG_REPLACE") : t("THEME.BG_UPLOAD")}
            </Button>
            {bgPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setBgDraft({ kind: "remove" })}
              >
                <Icon name="trash-2" className="mr-1.5 size-3.5" />
                {t("THEME.BG_REMOVE")}
              </Button>
            )}
          </div>
          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickBgFile(f);
              e.target.value = "";
            }}
          />
        </div>
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
            disabled={createMut.isPending || updateMut.isPending}
          >
            {t("COMMON.SAVE")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
