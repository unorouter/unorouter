"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { DbExportOptions } from "@/lib/db/client/data/diagnostics/db-export";
import type { ImportMode } from "@/lib/db/client/data-migrate/reconcile-import";
import {
  parseTransferCode,
  receiveDatabase,
  sendDatabase,
  type SentTransfer,
  type TransferStage,
} from "@/lib/db/client/transfer/transfer";
import type { TranslationKey } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { dbTransferAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { askImportMode, toastImportResult } from "./database-submenu";

const STAGE_KEY: Record<TransferStage, TranslationKey> = {
  export: "CHAT.DB_TRANSFER.STAGE_EXPORT",
  encrypt: "CHAT.DB_TRANSFER.STAGE_ENCRYPT",
  upload: "CHAT.DB_TRANSFER.STAGE_UPLOAD",
  download: "CHAT.DB_TRANSFER.STAGE_DOWNLOAD",
  decrypt: "CHAT.DB_TRANSFER.STAGE_DECRYPT",
  import: "CHAT.DB_TRANSFER.STAGE_IMPORT",
};

const EXPIRY_KEY: Record<SentTransfer["expiry"], TranslationKey> = {
  hour: "CHAT.DB_TRANSFER.EXPIRES_HOUR",
  days3: "CHAT.DB_TRANSFER.EXPIRES_3DAYS",
  untilReceived: "CHAT.DB_TRANSFER.EXPIRES_UNTIL_RECEIVED",
};

function isTranslationKey(value: string): value is TranslationKey {
  return value.startsWith("ERRORS.");
}

function useFail() {
  const t = useTranslations();
  return (err: unknown, stage: string) => {
    const text = String(err instanceof Error ? err.message : err);
    logger.error("DB transfer failed", {
      context: "local-db.transfer",
      stage,
      error: text,
    });
    toast.error(isTranslationKey(text) ? t(text) : text);
  };
}

function Stage(props: { stage: TransferStage }) {
  const t = useTranslations();
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Icon name="loader" className="size-4 animate-spin" />
      {t(STAGE_KEY[props.stage])}
    </div>
  );
}

function SendBody(props: {
  opts: Required<DbExportOptions>;
  onBusy: (busy: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const fail = useFail();
  const [stage, setStage] = useState<TransferStage>("export");
  const [sent, setSent] = useState<SentTransfer | null>(null);
  const [copied, setCopied] = useState(false);

  // StrictMode mounts twice in dev; a second export in the same millisecond
  // collides on the VACUUM INTO temp name, so the job starts exactly once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    props.onBusy(true);
    sendDatabase(props.opts, setStage)
      .then((result) => setSent(result))
      .catch((err) => {
        fail(err, "send");
        props.onClose();
      })
      .finally(() => props.onBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sent) return <Stage stage={stage} />;

  const qrValue = `${window.location.origin}/${locale}/chat?transfer=${encodeURIComponent(sent.code)}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center rounded-md border bg-white p-4">
        <QRCodeSVG value={qrValue} size={192} level="M" />
      </div>
      <p className="text-muted-foreground text-center text-xs">
        {t("CHAT.DB_TRANSFER.SCAN_HINT")}
      </p>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("CHAT.DB_TRANSFER.CODE_LABEL")}
        </span>
        <div className="flex items-center gap-2">
          <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-sm break-all select-all">
            {sent.code}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
              await copyToClipboard(sent.code);
              setCopied(true);
            }}
            aria-label={t("CHAT.DB_TRANSFER.COPY_CODE")}
          >
            <Icon name={copied ? "check" : "copy"} className="size-4" />
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("CHAT.DB_TRANSFER.SENT_VIA", {
          host: sent.hostName,
          size: `${(sent.bytes / (1024 * 1024)).toFixed(1)} MB`,
        })}{" "}
        {t(EXPIRY_KEY[sent.expiry])}
      </p>
    </div>
  );
}

function ReceiveBody(props: {
  initialCode: string;
  onBusy: (busy: boolean) => void;
}) {
  const t = useTranslations();
  const fail = useFail();
  const [code, setCode] = useState(props.initialCode);
  const [stage, setStage] = useState<TransferStage | null>(null);

  async function receive() {
    const parsed = parseTransferCode(code);
    if (!parsed) {
      toast.error(t("ERRORS.TRANSFER_BAD_CODE"));
      return;
    }
    props.onBusy(true);
    try {
      let mode: ImportMode = "replace";
      const result = await receiveDatabase(parsed, setStage, async () => {
        const choice = await askImportMode(t);
        if (choice) mode = choice;
        return choice;
      });
      if (!result) return;
      toastImportResult(t, mode, result);
    } catch (err) {
      fail(err, stage ?? "receive");
    } finally {
      setStage(null);
      props.onBusy(false);
    }
  }

  const busy = stage !== null;
  return (
    <div className="flex flex-col gap-3">
      {stage && <Stage stage={stage} />}
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("CHAT.DB_TRANSFER.ENTER_CODE")}
        disabled={busy}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
        onKeyDown={(e) => e.key === "Enter" && !busy && void receive()}
      />
      <Button onClick={receive} disabled={busy || !code.trim()}>
        <Icon name="download" className="size-4" />
        {t("CHAT.DB_TRANSFER.RECEIVE")}
      </Button>
    </div>
  );
}

export function DbTransferDialog() {
  const t = useTranslations();
  const [request, setRequest] = useAtom(dbTransferAtom);
  const [urlCode, setUrlCode] = useQueryState("transfer");
  const [busy, setBusy] = useState(false);

  // A scanned QR lands here with ?transfer=; consume it once, then drop it so
  // a reload after the import does not reopen the dialog.
  useEffect(() => {
    if (!urlCode) return;
    setRequest({ mode: "receive", code: urlCode });
    void setUrlCode(null);
  }, [urlCode, setRequest, setUrlCode]);

  const close = () => setRequest(null);

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(o) => !o && !busy && close()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {request?.mode === "send"
              ? t("CHAT.DB_TRANSFER.SEND_TITLE")
              : t("CHAT.DB_TRANSFER.RECEIVE_TITLE")}
          </DialogTitle>
          <DialogDescription>
            {t("CHAT.DB_TRANSFER.PRIVACY_NOTE")}
          </DialogDescription>
        </DialogHeader>
        {request?.mode === "send" && (
          <SendBody opts={request.opts} onBusy={setBusy} onClose={close} />
        )}
        {request?.mode === "receive" && (
          <ReceiveBody
            key={request.code ?? ""}
            initialCode={request.code ?? ""}
            onBusy={setBusy}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
