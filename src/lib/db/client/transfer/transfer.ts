import { msg } from "@/lib/config/constants";
import {
  buildExportFile,
  type DbExportOptions,
} from "@/lib/db/client/data/diagnostics/db-export";
import type { ReconcileImportResult } from "@/lib/db/client/data-migrate/reconcile-import";
import { uid } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { decryptTransfer, encryptTransfer } from "./crypto";
import {
  TRANSFER_HOSTS,
  transferHostByLetter,
  uploadWithRotation,
  type TransferExpiry,
  type TransferHost,
} from "./hosts";

export type TransferStage =
  "export" | "encrypt" | "upload" | "download" | "decrypt" | "import";

export type SentTransfer = {
  code: string;
  hostName: string;
  expiry: TransferExpiry;
  bytes: number;
};

export type ParsedCode = {
  host: TransferHost;
  id: string;
  secret: string;
  deleteToken?: string;
};

const SECRET_LENGTH = 12;
// <host>-<file id>-<secret>[-<delete token>]: the token rides along so the
// receiving device can wipe the copy, which the sender never sees happen.
const CODE_RE = /^([KTS])-([A-Za-z0-9.]+)-([A-Za-z0-9]+)(?:-([A-Za-z0-9]+))?$/;
const SALT = "unorouter-transfer";
const SQLITE_HEADER = "SQLite format 3\0";

export async function sendDatabase(
  opts: Required<DbExportOptions>,
  onStage: (stage: TransferStage) => void,
): Promise<SentTransfer> {
  onStage("export");
  const built = await buildExportFile({ ...opts, directFromDisk: false });
  try {
    const cap = Math.max(...TRANSFER_HOSTS.map((h) => h.capBytes));
    if (built.file.size > cap)
      throw new Error(msg("ERRORS.TRANSFER_TOO_LARGE"));
    onStage("encrypt");
    const secret = uid(SECRET_LENGTH);
    const encrypted = await encryptTransfer(
      await built.file.arrayBuffer(),
      secret,
      SALT,
    );
    onStage("upload");
    const blob = new Blob([encrypted], { type: "application/octet-stream" });
    const uploaded = await uploadWithRotation(blob);
    logChatDebug("transfer.sent", {
      host: uploaded.host.name,
      bytes: blob.size,
    });
    return {
      code: [uploaded.host.letter, uploaded.id, secret, uploaded.deleteToken]
        .filter(Boolean)
        .join("-"),
      hostName: uploaded.host.name,
      expiry: uploaded.host.expiry,
      bytes: blob.size,
    };
  } finally {
    await built.cleanup();
  }
}

export function parseTransferCode(raw: string): ParsedCode | null {
  const match = CODE_RE.exec(raw.trim());
  if (!match) return null;
  const host = transferHostByLetter(match[1]);
  if (!host) return null;
  return { host, id: match[2], secret: match[3], deleteToken: match[4] };
}

export async function importDatabaseBuffer(
  buffer: ArrayBuffer,
): Promise<ReconcileImportResult> {
  const { getLocalDb, suspendLocalDb, resumeLocalDb, resetLocalDbCache } =
    await import("@/lib/db/client/client");
  try {
    const local = await getLocalDb();
    // Suspend BEFORE destroy: a query hook racing the close would otherwise
    // reopen live and hold the write lock the import needs to graft from it.
    suspendLocalDb();
    if (local) await local.destroy();
    const { reconcileImport } =
      await import("@/lib/db/client/data-migrate/reconcile-import");
    return await reconcileImport(buffer).finally(resumeLocalDb);
  } catch (err) {
    logChatDebug("opfs.import.error", { error: String(err).slice(0, 200) });
    resumeLocalDb();
    resetLocalDbCache();
    throw err;
  }
}

export async function receiveDatabase(
  parsed: ParsedCode,
  onStage: (stage: TransferStage) => void,
  confirmImport: () => Promise<boolean>,
): Promise<ReconcileImportResult | null> {
  onStage("download");
  const res = await fetch(parsed.host.downloadUrl(parsed.id));
  if (res.status === 404 || res.status === 410)
    throw new Error(msg("ERRORS.TRANSFER_EXPIRED"));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  onStage("decrypt");
  const plain = await decryptTransfer(
    await res.arrayBuffer(),
    parsed.secret,
    SALT,
  );
  const header = new TextDecoder().decode(plain.slice(0, SQLITE_HEADER.length));
  if (header !== SQLITE_HEADER)
    throw new Error(msg("ERRORS.TRANSFER_BAD_CODE"));
  if (!(await confirmImport())) return null;
  onStage("import");
  const result = await importDatabaseBuffer(plain);
  logChatDebug("transfer.received", { host: parsed.host.name });
  void parsed.host.remove?.(parsed.id, parsed.deleteToken).catch((err) =>
    logChatDebug("transfer.remove_failed", {
      host: parsed.host.name,
      error: String(err).slice(0, 200),
    }),
  );
  return result;
}
