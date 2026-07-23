"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  useCharacterQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
} from "@/hooks/ai/rp/characters";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import {
  characterFormSchema,
  type CharacterForm,
} from "@/lib/validation/rp-forms";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { csvToArray, uid } from "@/lib/utils/base";
import { fileToScaledDataUrl, splitDataUrl } from "@/lib/utils/client";
import { formDefaults } from "@/lib/validation/helpers";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

type Props = {
  characterId?: string;
  onSaved: () => void;
};

type ImgDraft =
  { kind: "keep" } | { kind: "remove" } | { kind: "new"; dataUrl: string };

// One named image asset in the editor. `mediaId` is set for an existing/saved
// asset (image already in the media table); `dataUrl` is set for a fresh upload
// not yet persisted. A row keeps one or the other.
type AssetRow = {
  rowId: string;
  name: string;
  mediaId: string | null;
  dataUrl: string | null;
};

export function CharacterEditor(props: Props) {
  const t = useTranslations();
  const userId = useLocalUserId();
  const characterQuery = useCharacterQuery(props.characterId);
  const createMut = useCreateCharacterMutation();
  const updateMut = useUpdateCharacterMutation();
  const existing = characterQuery.data;
  const [bgDraft, setBgDraft] = useState<ImgDraft>({ kind: "keep" });
  const [avatarDraft, setAvatarDraft] = useState<ImgDraft>({ kind: "keep" });
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const existingBgSrc = useMediaSrc(
    bgDraft.kind === "keep" ? existing?.backgroundMediaId : null,
  );
  const existingAvatarSrc = useMediaSrc(
    avatarDraft.kind === "keep" ? existing?.avatarMediaId : null,
  );
  const bgPreview =
    bgDraft.kind === "new"
      ? bgDraft.dataUrl
      : bgDraft.kind === "keep"
        ? existingBgSrc
        : null;
  const avatarPreview =
    avatarDraft.kind === "new"
      ? avatarDraft.dataUrl
      : avatarDraft.kind === "keep"
        ? existingAvatarSrc
        : null;

  const [assetRows, setAssetRows] = useState<AssetRow[] | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAssetRowId = useRef<string | null>(null);
  // Seed the asset rows once from the loaded character; null = not seeded yet.
  const rows =
    assetRows ??
    (existing?.assets ?? []).map((a) => ({
      rowId: uid(),
      name: a.name,
      mediaId: a.mediaId,
      dataUrl: null,
    }));

  const addAssetRow = () =>
    setAssetRows([
      ...rows,
      { rowId: uid(), name: "", mediaId: null, dataUrl: null },
    ]);
  const removeAssetRow = (rowId: string) =>
    setAssetRows(rows.filter((r) => r.rowId !== rowId));
  const renameAssetRow = (rowId: string, name: string) =>
    setAssetRows(rows.map((r) => (r.rowId === rowId ? { ...r, name } : r)));
  const pickAssetFile = async (rowId: string, file: File) => {
    const dataUrl = await fileToScaledDataUrl(file);
    setAssetRows(
      rows.map((r) =>
        r.rowId === rowId ? { ...r, dataUrl, mediaId: null } : r,
      ),
    );
  };

  const formValues = existing
    ? formDefaults(characterFormSchema, {
        ...existing,
        tags: Array.isArray(existing.tags) ? existing.tags.join(", ") : "",
        triggers: Array.isArray(existing.triggers)
          ? existing.triggers.join(", ")
          : "",
      })
    : undefined;
  const form = useRpForm(characterFormSchema, formValues);

  const pickBgFile = async (file: File) => {
    const dataUrl = await fileToScaledDataUrl(file);
    setBgDraft({ kind: "new", dataUrl });
  };
  const pickAvatarFile = async (file: File) => {
    const dataUrl = await fileToScaledDataUrl(file);
    setAvatarDraft({ kind: "new", dataUrl });
  };

  const resolveMediaId = async (
    draft: ImgDraft,
    existingId: string | null | undefined,
  ): Promise<string | null> => {
    if (draft.kind === "remove") return null;
    if (draft.kind === "keep") return existingId ?? null;
    const parts = splitDataUrl(draft.dataUrl);
    if (!parts) return existingId ?? null;
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

  const resolveAssets = async (): Promise<
    { name: string; mediaId: string }[]
  > => {
    const resolved: { name: string; mediaId: string }[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      if (!name) continue;
      let mediaId = row.mediaId;
      if (row.dataUrl) {
        const parts = splitDataUrl(row.dataUrl);
        if (parts) {
          mediaId = uid();
          await upsertLocalMedia(userId, {
            id: mediaId,
            convId: null,
            mimeType: parts.mimeType,
            sizeBytes: Math.floor((parts.base64.length * 3) / 4),
            dataBase64: parts.base64,
          });
        }
      }
      if (mediaId) resolved.push({ name, mediaId });
    }
    return resolved;
  };

  const onSubmit = async (data: CharacterForm) => {
    const body = {
      ...data,
      tags: csvToArray(data.tags),
      triggers: csvToArray(data.triggers),
      avatarMediaId: await resolveMediaId(avatarDraft, existing?.avatarMediaId),
      backgroundMediaId: await resolveMediaId(
        bgDraft,
        existing?.backgroundMediaId,
      ),
      assets: await resolveAssets(),
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
            {t("RP.CHARACTER_AVATAR")}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("RP.CHARACTER_AVATAR_HINT")}
          </p>
          {avatarPreview && (
            <div className="border-border/40 relative size-24 overflow-hidden rounded-full border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, next/image can't optimize it */}
              <img
                src={avatarPreview}
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
              onClick={() => avatarFileInputRef.current?.click()}
            >
              <Icon name="upload" className="mr-1.5 size-3.5" />
              {avatarPreview ? t("THEME.BG_REPLACE") : t("THEME.BG_UPLOAD")}
            </Button>
            {avatarPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAvatarDraft({ kind: "remove" })}
              >
                <Icon name="trash-2" className="mr-1.5 size-3.5" />
                {t("THEME.BG_REMOVE")}
              </Button>
            )}
          </div>
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickAvatarFile(f);
              e.target.value = "";
            }}
          />
        </div>
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
            {t("RP.CHARACTER_ASSETS_TITLE")}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("RP.CHARACTER_ASSETS_HINT")}
          </p>
          {rows.map((row) => (
            <AssetRowItem
              key={row.rowId}
              row={row}
              existingMediaId={row.dataUrl ? null : (row.mediaId ?? null)}
              namePlaceholder={t("RP.CHARACTER_ASSET_NAME_PLACEHOLDER")}
              onRename={(name) => renameAssetRow(row.rowId, name)}
              onPick={() => {
                pendingAssetRowId.current = row.rowId;
                assetInputRef.current?.click();
              }}
              onRemove={() => removeAssetRow(row.rowId)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAssetRow}
          >
            <Icon name="plus" className="mr-1.5 size-3.5" />
            {t("RP.CHARACTER_ASSET_ADD")}
          </Button>
          <input
            ref={assetInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              const rowId = pendingAssetRowId.current;
              if (f && rowId) void pickAssetFile(rowId, f);
              pendingAssetRowId.current = null;
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

function AssetRowItem(props: {
  row: AssetRow;
  existingMediaId: string | null;
  namePlaceholder: string;
  onRename: (name: string) => void;
  onPick: () => void;
  onRemove: () => void;
}) {
  const existingSrc = useMediaSrc(props.existingMediaId);
  const preview = props.row.dataUrl ?? existingSrc;
  return (
    <div className="flex items-center gap-2">
      <div className="border-border/40 bg-muted relative size-12 shrink-0 overflow-hidden rounded border">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data-URL preview
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={props.onPick}
            className="text-muted-foreground flex h-full w-full items-center justify-center"
          >
            <Icon name="image" className="size-4" />
          </button>
        )}
      </div>
      <Input
        value={props.row.name}
        onChange={(e) => props.onRename(e.target.value)}
        placeholder={props.namePlaceholder}
        className="h-9 flex-1"
      />
      <Button type="button" variant="ghost" size="icon" onClick={props.onPick}>
        <Icon name="upload" className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={props.onRemove}
      >
        <Icon name="trash-2" className="size-3.5" />
      </Button>
    </div>
  );
}
