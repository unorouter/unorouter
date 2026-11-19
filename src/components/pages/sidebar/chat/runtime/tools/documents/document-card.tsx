"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { mediaStore } from "@/lib/db/client/data/media/media";
import { base64ToUint8, rec } from "@/lib/utils/base";
import { downloadBlob, handleError } from "@/lib/utils/client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

function formatSize(bytes: number, locale: string) {
  const mb = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: mb ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes / (mb ? 1024 * 1024 : 1024));
}

export function DocumentFileCard(props: { result: unknown }) {
  const t = useTranslations();
  const locale = useLocale();
  const r = rec(props.result);
  const fileId = r?.fileId;
  const filename = r?.filename;
  if (typeof fileId !== "string" || typeof filename !== "string") return null;
  const size = typeof r?.sizeBytes === "number" ? r.sizeBytes : null;

  const download = async () => {
    try {
      const row = await mediaStore.get(fileId);
      if (!row?.dataBase64) {
        toast.error(t("CHAT.TOOLS.FILE_MISSING"));
        return;
      }
      downloadBlob(
        new Blob([base64ToUint8(row.dataBase64)], { type: row.mimeType }),
        filename,
      );
    } catch (e) {
      handleError(e, t);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border px-3 py-2">
      <Icon
        name="file-text"
        className="text-muted-foreground size-5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename}</p>
        {size !== null && (
          <p className="text-muted-foreground text-xs">
            {formatSize(size, locale)}
          </p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={() => void download()}>
        <Icon name="download" className="size-4" />
        {t("CHAT.TOOLS.DOWNLOAD")}
      </Button>
    </div>
  );
}
