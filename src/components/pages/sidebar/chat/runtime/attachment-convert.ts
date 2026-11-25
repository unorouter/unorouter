import { msg } from "@/lib/config/constants";

const MAX_TEXT_CHARS = 2_000_000;
const SKIP_PATH = /(^|\/)(__MACOSX|\.git|node_modules|\.DS_Store)(\/|$)/;

function decodeText(bytes: Uint8Array): string | null {
  if (bytes.subarray(0, 8000).includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// One text file: every readable entry under a path header, binaries listed by name.
export async function zipToText(file: File): Promise<File> {
  const { unzipSync } = await import("fflate");
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const sections: string[] = [];
  const skipped: string[] = [];
  let size = 0;
  for (const [path, bytes] of Object.entries(entries)) {
    if (path.endsWith("/") || SKIP_PATH.test(path)) continue;
    const text = decodeText(bytes);
    if (text === null || size + text.length > MAX_TEXT_CHARS) {
      skipped.push(path);
      continue;
    }
    size += text.length;
    sections.push(`--- ${path} ---\n${text}`);
  }
  if (sections.length === 0)
    throw new Error(msg("CHAT.ATTACHMENT.ZIP_NO_TEXT"));
  if (skipped.length)
    sections.push(
      `--- not included (binary or too large) ---\n${skipped.join("\n")}`,
    );
  return new File([sections.join("\n\n")], file.name, { type: "text/plain" });
}

function decodeQuotedPrintable(s: string): Uint8Array {
  const out: number[] = [];
  const body = s.replace(/=\r?\n/g, "");
  for (let i = 0; i < body.length; i++) {
    const hex = body[i] === "=" ? body.slice(i + 1, i + 3) : "";
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      out.push(parseInt(hex, 16));
      i += 2;
    } else out.push(body.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}

// A saved page: keep the HTML part, drop the inlined images, fonts, scripts and styles.
export async function mhtmlToHtml(file: File): Promise<File> {
  const raw = await file.text();
  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(raw)?.[1];
  const parts = boundary ? raw.split(`--${boundary}`) : [raw];
  let html = raw;
  for (const part of parts) {
    const split = part.search(/\r?\n\r?\n/);
    if (split < 0) continue;
    const head = part.slice(0, split);
    if (!/content-type:\s*text\/html/i.test(head)) continue;
    const body = part.slice(split).trim();
    const encoding = /content-transfer-encoding:\s*([\w-]+)/i.exec(head)?.[1];
    const bytes =
      encoding?.toLowerCase() === "quoted-printable"
        ? decodeQuotedPrintable(body)
        : encoding?.toLowerCase() === "base64"
          ? Uint8Array.from(atob(body.replace(/\s+/g, "")), (c) =>
              c.charCodeAt(0),
            )
          : new TextEncoder().encode(body);
    html = new TextDecoder().decode(bytes);
    break;
  }
  const cleaned = html
    .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/(src|href)="data:[^"]*"/gi, '$1=""');
  return new File([cleaned], file.name, { type: "text/html" });
}
