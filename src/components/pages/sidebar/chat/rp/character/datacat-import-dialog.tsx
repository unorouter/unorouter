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
  // Keyed so a second character mints a new nonce instead of reusing one a
  // previous frame could still answer with.
  return (
    <DatacatFrame
      key={props.characterId}
      characterId={props.characterId}
      onClose={props.onClose}
      onCard={props.onCard}
    />
  );
}

function DatacatFrame(props: {
  characterId: string;
  onClose: () => void;
  onCard: (file: File) => Promise<void>;
}) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, props.onCard, props.onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{t("RP.CHARACTERS_IMPORT_DATACAT")}</DialogTitle>
          <DialogDescription>
            {error ?? t("RP.CHARACTERS_IMPORT_DATACAT_HINT")}
          </DialogDescription>
        </DialogHeader>
        <iframe
          src={datacatEmbedUrl(props.characterId, nonce)}
          className="min-h-0 flex-1 rounded-md border"
          // Without allow-same-origin datacat's own storage is denied, its
          // bridge never gets a session, and the frame emits nothing at all.
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          referrerPolicy="no-referrer"
        />
      </DialogContent>
    </Dialog>
  );
}
