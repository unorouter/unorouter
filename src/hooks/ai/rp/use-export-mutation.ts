"use client";

import { analytics } from "@/lib/analytics";
import { msg } from "@/lib/config/constants";
import { rpc } from "@/lib/rpc";
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

function exportRequest(args: ExportArgs) {
  switch (args.kind) {
    case "characters":
      return rpc.api.ai.rp
        .characters({ id: args.id })
        .export.get({ query: { format: args.format } });
    case "lorebooks":
      return rpc.api.ai.rp
        .lorebooks({ id: args.id })
        .export.get({ query: { format: args.format } });
    case "presets":
      return rpc.api.ai.rp.presets({ id: args.id }).export.get();
    case "cards":
      return rpc.api.ai.rp.cards({ id: args.id }).export.get();
  }
}

// Shared export mutation for every RP entity: build the request from the
// kind, unwrap the Eden file response, honor the server's content-disposition
// filename (falling back to `<kind>-<id>[.<format>].json`), download, and
// report the `exported` analytics event. Failures surface as an i18n error
// toast; `isPending` drives button state.
export function useRpExportMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (args: ExportArgs) => {
      const { response, error } = await exportRequest(args);
      if (error || !response.ok) {
        throw new Error(msg("CHAT.MORE.EXPORT_FAILED"));
      }
      const blob = await response.blob();
      const format = "format" in args ? args.format : undefined;
      const fallback = format
        ? `${args.kind}-${args.id}.${format}.json`
        : `${args.kind}-${args.id}.json`;
      const filename =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? fallback;
      downloadBlob(blob, filename);
      analytics.rp.entityAction({
        entity: args.kind,
        action: "exported",
        format,
      });
    },
    onError: (e) => handleError(e, t),
  });
}
