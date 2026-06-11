"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { useApiMutation } from "@/lib/react-query/hooks";
import { analytics } from "@/lib/analytics";
import {
  exportLocalCard,
  exportLocalCharacter,
  exportLocalLorebook,
  exportLocalPreset,
} from "@/lib/db/client/data/rp-export";
import { downloadBlob } from "@/lib/utils/client";
import type {
  CharacterExportFormat,
  LorebookExportFormat,
} from "@/lib/validation/rp";

// Characters/lorebooks carry their own format union (tags the analytics event
// and the fallback filename); cards/presets export a single native format.
type ExportArgs =
  | { kind: "characters"; id: string; format: CharacterExportFormat }
  | { kind: "lorebooks"; id: string; format: LorebookExportFormat }
  | { kind: "presets"; id: string }
  | { kind: "cards"; id: string };

// Local-first export: row (+ avatar bytes) from SQLocal through the `@/lib/ai/rp`
// helpers into a blob download. No server roundtrip; works offline + for guests.
export function useRpExportMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (args: ExportArgs) => {
      const result = await runExport(userId, args);
      downloadBlob(result.blob, result.filename);
      analytics.rp.entityAction({
        entity: args.kind,
        action: "exported",
        format: "format" in args ? args.format : undefined,
      });
    },
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
