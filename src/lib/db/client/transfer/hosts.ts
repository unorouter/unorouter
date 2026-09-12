import { msg } from "@/lib/config/constants";
import { rec } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";

export type TransferHostLetter = "K" | "T" | "S";

export type TransferExpiry = "hour" | "days3" | "untilReceived";

export type TransferHost = {
  letter: TransferHostLetter;
  name: string;
  capBytes: number;
  expiry: TransferExpiry;
  upload: (blob: Blob) => Promise<{ id: string; deleteToken?: string }>;
  downloadUrl: (id: string) => string;
  remove?: (id: string, deleteToken?: string) => Promise<void>;
};

const UPLOAD_NAME = "transfer.bin";
const MIB = 1024 * 1024;

async function readJson(res: Response): Promise<Record<string, unknown>> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return rec(await res.json()) ?? {};
}

const kappa: TransferHost = {
  letter: "K",
  name: "kappa.lol",
  capBytes: 100 * MIB,
  expiry: "untilReceived",
  async upload(blob) {
    const form = new FormData();
    form.append("file", blob, UPLOAD_NAME);
    const json = await readJson(
      await fetch("https://kappa.lol/api/upload", {
        method: "POST",
        body: form,
      }),
    );
    const id = json.id;
    const key = json.key;
    if (typeof id !== "string" || !id) throw new Error("no id");
    const ext = typeof json.ext === "string" ? json.ext : "";
    return {
      id: `${id}${ext}`,
      deleteToken: typeof key === "string" ? key : undefined,
    };
  },
  downloadUrl: (id) => `https://kappa.lol/${id}`,
  async remove(_id, deleteToken) {
    if (!deleteToken) return;
    await fetch(
      `https://kappa.lol/api/delete?key=${encodeURIComponent(deleteToken)}`,
    );
  },
};

const tempfile: TransferHost = {
  letter: "T",
  name: "tempfile.org",
  capBytes: 100 * 1000 * 1000,
  expiry: "hour",
  async upload(blob) {
    const form = new FormData();
    form.append("files", blob, UPLOAD_NAME);
    form.append("expiryHours", "1");
    const json = await readJson(
      await fetch("https://tempfile.org/api/upload/local", {
        method: "POST",
        body: form,
      }),
    );
    const first = (Array.isArray(json.files) && rec(json.files[0])) || {};
    if (typeof first.id !== "string" || !first.id) throw new Error("no id");
    return { id: first.id };
  },
  downloadUrl: (id) => `https://tempfile.org/${id}/download`,
  async remove(id) {
    await fetch(`https://tempfile.org/api/file/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

const stoCare: TransferHost = {
  letter: "S",
  name: "sto.care",
  capBytes: 100 * 1000 * 1000,
  expiry: "days3",
  async upload(blob) {
    const json = await readJson(
      await fetch(`https://ul.sto.care/${UPLOAD_NAME}`, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
    const url = typeof json.url === "string" ? json.url : "";
    const id = url.split("/").filter(Boolean).at(-1) ?? "";
    if (!id) throw new Error("no id");
    return { id };
  },
  downloadUrl: (id) => `https://dl.sto.care/${id}`,
};

// Rotation order: kappa deletes on demand, tempfile expires in an hour,
// sto.care caps at 10 uploads per IP per day so it goes last.
export const TRANSFER_HOSTS: readonly TransferHost[] = [
  kappa,
  tempfile,
  stoCare,
];

export function transferHostByLetter(letter: string): TransferHost | undefined {
  return TRANSFER_HOSTS.find((host) => host.letter === letter);
}

export async function uploadWithRotation(
  blob: Blob,
): Promise<{ host: TransferHost; id: string; deleteToken?: string }> {
  for (const host of TRANSFER_HOSTS) {
    if (blob.size > host.capBytes) continue;
    try {
      const result = await host.upload(blob);
      logChatDebug("transfer.upload.ok", { host: host.name, bytes: blob.size });
      return { host, ...result };
    } catch (err) {
      logChatDebug("transfer.upload.failed", {
        host: host.name,
        error: String(err).slice(0, 200),
      });
    }
  }
  throw new Error(msg("ERRORS.TRANSFER_ALL_HOSTS_FAILED"));
}
