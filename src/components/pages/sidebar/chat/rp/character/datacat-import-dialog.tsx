"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  datacatEmbedUrl,
  listenForDatacatCard,
} from "@/lib/ai/rp/datacat-bridge";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  characterId: string | null;
  onClose: () => void;
  onCard: (file: File) => Promise<void>;
};

export function DatacatImportDialog(props: Props) {
  if (!props.characterId) return null;
  // Remounted per character by the key, so the nonce and the listener are set
  // up once for a frame that cannot outlive them.
  return <DatacatFrame key={props.characterId} {...props} />;
}

function DatacatFrame(props: Props) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [nonce] = useState(() => crypto.randomUUID());

  useEffect(() => {
    return listenForDatacatCard(nonce, {
      onCard: async (file) => {
        await props.onCard(file);
        props.onClose();
      },
      onError: setError,
    });
  }, [nonce, props.onCard, props.onClose]);

  return (
    <Dialog
      open={!!props.characterId}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{t("RP.CHARACTERS_IMPORT_DATACAT")}</DialogTitle>
          <DialogDescription>
            {error ?? t("RP.CHARACTERS_IMPORT_DATACAT_HINT")}
          </DialogDescription>
        </DialogHeader>
        {props.characterId ? (
          <iframe
            src={datacatEmbedUrl(props.characterId, nonce)}
            className="min-h-0 flex-1 rounded-md border"
            // allow-same-origin restores datacat's OWN origin, not ours, so the
            // frame reaches its cookies and storage while the origin boundary
            // between it and this page stands. Its bridge needs a session, and
            // without this the frame is inert and never emits a card at all.
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
