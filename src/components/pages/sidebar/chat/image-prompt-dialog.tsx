"use client";

import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  readLocalMedia,
  upsertLocalMedia,
} from "@/lib/db/client/data/media/media";
import { invalidateInlay } from "@/lib/db/client/data/media/inlay-render";
import { handleError } from "@/lib/utils/client";
import { chatStore } from "@/store/chat-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  imagePromptRequestAtom,
  type ImagePromptRequest,
} from "./image-prompt-dialog-store";

function settleReview(
  request: ImagePromptRequest | null,
  edited: string | null,
) {
  if (request?.mode === "review") request.resolve(edited);
  chatStore.set(imagePromptRequestAtom, null);
}

export function ImagePromptDialogHost() {
  const request = useAtomValue(imagePromptRequestAtom);
  if (!request) return null;
  const key =
    request.mode === "media" ? `m:${request.mediaId}` : `r:${request.prompt}`;
  return <ImagePromptEditor key={key} request={request} />;
}

function ImagePromptEditor(props: { request: ImagePromptRequest }) {
  const t = useTranslations();
  const request = props.request;
  const isReview = request.mode === "review";
  const [prompt, setPrompt] = useState(isReview ? request.prompt : "");
  const [convId, setConvId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (request.mode !== "media") return;
    let cancelled = false;
    void readLocalMedia(request.mediaId).then((row) => {
      if (cancelled) return;
      setPrompt(row?.promptText ?? "");
      setConvId(row?.convId ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const close = () => {
    if (busy) return;
    settleReview(request, null);
  };

  const regenerate = async () => {
    if (request.mode !== "media" || !prompt.trim()) return;
    setBusy(true);
    try {
      const { requestImggen, resolveIllustratorSettings, resolveRefUrls } =
        await import("./runtime/illustrator-run");
      const settings = convId ? await resolveIllustratorSettings(convId) : null;
      const refUrls = settings?.refMediaIds.length
        ? await resolveRefUrls(settings.refMediaIds)
        : [];
      const img = await requestImggen(prompt.trim(), {
        imageModel: settings?.imageModel,
        refUrls,
      });
      if (!img) throw new Error("ERRORS.UNEXPECTED_ERROR");
      analytics.chat.imageGenerated({
        source: "regenerate",
        model: settings?.imageModel ?? "auto",
      });
      await upsertLocalMedia({
        id: request.mediaId,
        convId,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        dataBase64: img.dataBase64,
        promptText: prompt.trim(),
      });
      invalidateInlay(request.mediaId);
      chatStore.set(imagePromptRequestAtom, null);
    } catch (e) {
      void handleError(e, t);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReview
              ? t("CHAT.IMAGE_PROMPT.REVIEW_TITLE")
              : t("CHAT.IMAGE_PROMPT.TITLE")}
          </DialogTitle>
          <DialogDescription>
            {isReview
              ? t("CHAT.IMAGE_PROMPT.REVIEW_HINT")
              : t("CHAT.IMAGE_PROMPT.HINT")}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          className="text-xs"
          disabled={busy}
        />
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            {isReview ? t("CHAT.IMAGE_PROMPT.SKIP") : t("COMMON.CANCEL")}
          </Button>
          {isReview ? (
            <Button
              onClick={() => settleReview(request, prompt.trim() || null)}
              disabled={!prompt.trim()}
            >
              {t("CHAT.IMAGE_PROMPT.GENERATE")}
            </Button>
          ) : (
            <Button onClick={regenerate} disabled={busy || !prompt.trim()}>
              {busy
                ? t("CHAT.IMAGE_PROMPT.REGENERATING")
                : t("CHAT.IMAGE_PROMPT.REGENERATE")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
