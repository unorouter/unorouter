"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  RpImageField,
  resolveMediaId,
  type ImgDraft,
} from "../shared/rp-image-field";
import { formDefaults } from "@/lib/validation/helpers";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

type Props = {
  characterId?: string;
  onSaved: () => void;
};

type AssetRow = {
  rowId: string;
  name: string;
  mediaId: string | null;
  dataUrl: string | null;
};

type GreetingRow = { rowId: string; text: string };

export function CharacterEditor(props: Props) {
  const t = useTranslations();
  const characterQuery = useCharacterQuery(props.characterId);
  const createMut = useCreateCharacterMutation();
  const updateMut = useUpdateCharacterMutation();
  const existing = characterQuery.data;
  const [bgDraft, setBgDraft] = useState<ImgDraft>({ kind: "keep" });
  const [avatarDraft, setAvatarDraft] = useState<ImgDraft>({ kind: "keep" });
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

  const [greetingRows, setGreetingRows] = useState<GreetingRow[] | null>(null);
  // Derived rows are re-created on every render, so their ids must come from
  // position: uid() here would hand React a new key each time, remounting the
  // textarea mid-keystroke and losing the edit the handler was closed over.
  const greetings =
    greetingRows ??
    (existing?.alternateGreetings ?? []).map((text, i) => ({
      rowId: `g${i}`,
      text,
    }));
  const addGreetingRow = () =>
    setGreetingRows([...greetings, { rowId: uid(), text: "" }]);
  const removeGreetingRow = (rowId: string) =>
    setGreetingRows(greetings.filter((g) => g.rowId !== rowId));
  const editGreetingRow = (rowId: string, text: string) =>
    setGreetingRows(
      greetings.map((g) => (g.rowId === rowId ? { ...g, text } : g)),
    );

  const [assetRows, setAssetRows] = useState<AssetRow[] | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAssetRowId = useRef<string | null>(null);
  const rows =
    assetRows ??
    (existing?.assets ?? []).map((a, i) => ({
      rowId: `a${i}`,
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
        triggers: Array.isArray(existing.turnTriggers)
          ? existing.turnTriggers.join(", ")
          : "",
      })
    : undefined;
  const form = useRpForm(characterFormSchema, formValues);

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
          await upsertLocalMedia({
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
    // The DB `triggers` column holds imported scripts, not these words; the key must be
    // omitted entirely, since an explicit undefined still overwrites them.
    const { triggers: triggerWords, ...rest } = data;
    const body = {
      ...rest,
      tags: csvToArray(data.tags),
      turnTriggers: csvToArray(triggerWords),
      alternateGreetings: greetings
        .map((g) => g.text.trim())
        .filter((text) => text.length > 0),
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
        <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-medium tracking-wide uppercase">
            {t("RP.CHARACTER_ALT_GREETINGS_TITLE")}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("RP.CHARACTER_ALT_GREETINGS_HINT")}
          </p>
          {greetings.map((row, index) => (
            <div key={row.rowId} className="flex items-start gap-2">
              <Textarea
                value={row.text}
                rows={3}
                placeholder={t("RP.CHARACTER_ALT_GREETING_PLACEHOLDER", {
                  index: index + 2,
                })}
                onChange={(e) => editGreetingRow(row.rowId, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("RP.CHARACTER_ALT_GREETING_REMOVE")}
                onClick={() => removeGreetingRow(row.rowId)}
              >
                <Icon name="trash-2" className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGreetingRow}
          >
            <Icon name="plus" className="mr-1.5 size-3.5" />
            {t("RP.CHARACTER_ALT_GREETING_ADD")}
          </Button>
        </div>
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
        <RpImageField
          labelKey="RP.CHARACTER_AVATAR"
          hintKey="RP.CHARACTER_AVATAR_HINT"
          preview={avatarPreview}
          onPick={setAvatarDraft}
          shape="circle"
        />
        <RpImageField
          labelKey="RP.CHARACTER_BACKGROUND"
          hintKey="RP.CHARACTER_BACKGROUND_HINT"
          preview={bgPreview}
          onPick={setBgDraft}
          shape="banner"
        />
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
