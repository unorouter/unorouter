"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImportGenerationMutation } from "@/hooks/ai/image-hook";
import {
  importPayloadChecker,
  type ImageCloneMode,
} from "@/lib/validation/image";
import { safeParse } from "@/lib/validation/helpers";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SnapshotImportDialog(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const importMut = useImportGenerationMutation();
  const [importMode, setImportMode] = useState<ImageCloneMode>("restore");

  const onImportFile = async (file: File) => {
    // The upload is arbitrary JSON headed for DB rows (and, on regenerate, the submit
    // path); nothing unchecked gets through.
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      toast.error(t("IMAGE.IMPORT_INVALID"));
      return;
    }
    const parsed = safeParse(importPayloadChecker, raw);
    if (!parsed.success) {
      toast.error(t("IMAGE.IMPORT_INVALID"));
      return;
    }
    const result = await importMut.mutateAsync({
      payload: parsed.data,
      mode: importMode,
    });
    props.onOpenChange(false);
    router.push(`/image/${result.sessionId}`);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("IMAGE.IMPORT_TITLE")}</DialogTitle>
          <DialogDescription>{t("IMAGE.IMPORT_DESCRIPTION")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Select
            value={importMode}
            onValueChange={(v) =>
              setImportMode(v === "regenerate" ? "regenerate" : "restore")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restore">
                {t("IMAGE.IMPORT_MODE_RESTORE")}
              </SelectItem>
              <SelectItem value="regenerate">
                {t("IMAGE.IMPORT_MODE_REGENERATE")}
              </SelectItem>
            </SelectContent>
          </Select>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
            }}
            className="text-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
