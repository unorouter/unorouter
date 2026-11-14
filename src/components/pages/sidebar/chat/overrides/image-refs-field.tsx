"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import {
  useChatSettingsQuery,
  useUpdateChatSettingsMutation,
} from "@/hooks/ai/rp/conversations";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { handleError } from "@/lib/utils/client";
import { fileToBase64, uid } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { useMediaSrc } from "@/hooks/ai/use-media-src";

const MAX_REFS = 6;
const MAX_REF_BYTES = 5 * 1024 * 1024;

function parseRefIds(raw: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function ImageRefsField(props: { convId: string }) {
  const t = useTranslations();
  const settingsQuery = useChatSettingsQuery(props.convId);
  const updateSettings = useUpdateChatSettingsMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  const refIds = parseRefIds(settingsQuery.data?.imageRefIds);

  const saveRefIds = async (ids: string[]) => {
    await updateSettings.mutateAsync({
      convId: props.convId,
      body: { imageRefIds: ids.length ? JSON.stringify(ids) : null },
    });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const ids = [...refIds];
      for (const file of Array.from(files)) {
        if (ids.length >= MAX_REFS) break;
        if (!file.type.startsWith("image/") || file.size > MAX_REF_BYTES)
          continue;
        const id = uid();
        await upsertLocalMedia({
          id,
          convId: props.convId,
          mimeType: file.type,
          sizeBytes: file.size,
          dataBase64: await fileToBase64(file),
        });
        ids.push(id);
      }
      await saveRefIds(ids);
    } catch (e) {
      void handleError(e, t);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    try {
      await saveRefIds(refIds.filter((x) => x !== id));
    } catch (e) {
      void handleError(e, t);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs">
          {t("CHAT.OVERRIDES.IMAGE_REFS")}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={refIds.length >= MAX_REFS || updateSettings.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="plus" className="size-3.5" />
          {t("CHAT.OVERRIDES.IMAGE_REFS_ADD")}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />
      {refIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {refIds.map((id) => (
            <RefThumb key={id} mediaId={id} onRemove={() => void remove(id)} />
          ))}
        </div>
      )}
      <span className="text-muted-foreground text-xs">
        {t("CHAT.OVERRIDES.IMAGE_REFS_HINT")}
      </span>
    </div>
  );
}

function RefThumb(props: { mediaId: string; onRemove: () => void }) {
  const src = useMediaSrc(props.mediaId);
  if (!src) return null;
  return (
    <span className="group/ref relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob thumbnails */}
      <img
        src={src}
        alt=""
        className="size-14 rounded-md border object-cover"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute -top-1.5 -right-1.5 size-4 rounded-full p-0"
        onClick={props.onRemove}
      >
        <Icon name="x" className="size-2.5" />
      </Button>
    </span>
  );
}
