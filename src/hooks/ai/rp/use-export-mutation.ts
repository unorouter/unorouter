"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { analytics } from "@/lib/analytics";
import {
  exportLocalCard,
  exportLocalCharacter,
  exportLocalLorebook,
  exportLocalPreset,
} from "@/lib/db/client/data/rp-export";
import { downloadBlob, handleError } from "@/lib/utils/client";
import type {
  CharacterExportFormat,
  LorebookExportFormat,
} from "@/lib/validation/rp";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// Characters/lorebooks carry their own format union (tags the analytics event
// and the fallback filename); cards/presets export a single native format.
type ExportArgs =
  | { kind: "characters"; id: string; format: CharacterExportFormat }
  | { kind: "lorebooks"; id: string; format: LorebookExportFormat }
  | { kind: "presets"; id: string }
  | { kind: "cards"; id: string };

// Local-first export: reads the row + (for characters) avatar bytes from
// SQLocal, calls the isomorphic helpers in `@/lib/ai/rp`, downloads the blob.
// No server roundtrip; works offline + for guests.
export function useRpExportMutation() {
  const t = useTranslations();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: ExportArgs) => {
      const userId = auth.data?.id;
      const result = await runExport(userId, args);
      downloadBlob(result.blob, result.filename);
      analytics.rp.entityAction({
        entity: args.kind,
        action: "exported",
        format: "format" in args ? args.format : undefined,
      });
    },
    onError: (e) => handleError(e, t),
  });
}

function runExport(userId: number | undefined, args: ExportArgs) {
  switch (args.kind) {
    case "characters":
      return exportLocalCharacter(userId, args.id, args.format);
    case "lorebooks":
      return exportLocalLorebook(userId, args.id, args.format);
    case "presets":
      return exportLocalPreset(userId, args.id);
    case "cards":
      return exportLocalCard(userId, args.id);
  }
}
