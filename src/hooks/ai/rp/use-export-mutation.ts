"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { analytics } from "@/lib/analytics";
import {
  exportLocalCard,
  exportLocalCharacter,
  exportLocalLorebook,
  exportLocalPersona,
  exportLocalPlugin,
  exportLocalPreset,
} from "@/lib/db/client/data/rp/rp-export";
import { downloadBlob } from "@/lib/utils/client";
import type {
  CharacterExportFormat,
  LorebookExportFormat,
} from "@/lib/validation/rp";

type ExportArgs =
  | { kind: "characters"; id: string; format: CharacterExportFormat }
  | { kind: "lorebooks"; id: string; format: LorebookExportFormat }
  | { kind: "presets"; id: string }
  | { kind: "personas"; id: string }
  | { kind: "js_plugins"; id: string }
  | { kind: "cards"; id: string };

export function useRpExportMutation() {
  return useApiMutation({
    mutationFn: async (args: ExportArgs) => {
      const result = await runExport(args);
      downloadBlob(result.blob, result.filename);
      analytics.rp.entityAction({
        entity: args.kind,
        action: "exported",
        format: "format" in args ? args.format : undefined,
      });
    },
  });
}

function runExport(args: ExportArgs) {
  switch (args.kind) {
    case "characters":
      return exportLocalCharacter(args.id, args.format);
    case "lorebooks":
      return exportLocalLorebook(args.id, args.format);
    case "presets":
      return exportLocalPreset(args.id);
    case "personas":
      return exportLocalPersona(args.id);
    case "js_plugins":
      return exportLocalPlugin(args.id);
    case "cards":
      return exportLocalCard(args.id);
  }
}
