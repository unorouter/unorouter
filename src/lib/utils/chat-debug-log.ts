export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
// setItem is synchronous and scales with SERIALIZED size: a full 2000-entry
// buffer (~400KB) parks the main thread for seconds per write.
const MAX_PERSISTED_ENTRIES = 200;
const SAVE_DEBOUNCE_MS = 1000;
const STORAGE_KEY = "unorouter-chat-debug-log";

let buffer: ChatDebugEntry[] | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistDisabled = false;

// Lazy, NOT at module init: load() is a blocking getItem + JSON.parse and the
// chat runtime imports this module on every page load.
function getBuffer(): ChatDebugEntry[] {
  if (buffer === null) buffer = load();
  return buffer;
}

function load(): ChatDebugEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(): void {
  if (
    saveTimer !== null ||
    persistDisabled ||
    typeof localStorage === "undefined"
  )
    return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const entries = getBuffer();
    const tail = entries.slice(-MAX_PERSISTED_ENTRIES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tail));
    } catch {
      // Over quota or blocked: latch off, a sync write per second cannot land.
      persistDisabled = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, SAVE_DEBOUNCE_MS);
}

export function logChatDebug(
  event: string,
  data?: Record<string, unknown>,
): void {
  let entry: ChatDebugEntry = { ts: Date.now(), event, ...data };
  if (data) {
    try {
      const bytes = JSON.stringify(data).length;
      if (bytes > MAX_ENTRY_BYTES)
        entry = { ts: Date.now(), event, _truncated: true, _bytes: bytes };
    } catch {
      entry = { ts: Date.now(), event, _unserializable: true };
    }
  }
  const entries = getBuffer();
  entries.push(entry);
  if (entries.length > MAX_ENTRIES)
    entries.splice(0, entries.length - MAX_ENTRIES);
  save();
}

export function getChatDebugLog(): ChatDebugEntry[] {
  return getBuffer().slice();
}

export type TextFingerprint = {
  chars: number;
  bytes: number;
  nonAscii: number;
  controlChars: number;
  loneSurrogates: number;
  replacementChars: number;
  maxCodePoint: number;
  tags: string[];
};

export type FailedRequestCapture = {
  ts: number;
  model: string;
  group: string | null;
  url: string | null;
  system: TextFingerprint | null;
  messages: ({ role: string } & TextFingerprint)[];
  modelParams: unknown;
  status?: number | null;
  code?: string | null;
  requestId?: string | null;
  message?: string;
};

// NEVER put message text in a capture: users paste the export into public
// channels. This list is fixed, so only known markers can ever appear.
const TAG_PATTERNS = [
  "{{user}}",
  "{{char}}",
  "{{bot}}",
  "{{img::",
  "{{random",
  "{{roll",
  "{{//",
  "<think>",
  "</think>",
] as const;

export function fingerprintText(text: string): TextFingerprint {
  let nonAscii = 0;
  let controlChars = 0;
  let loneSurrogates = 0;
  let replacementChars = 0;
  let maxCodePoint = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 127) nonAscii++;
    // Tab/LF/CR are normal prose; the rest of C0 plus DEL is re-encode damage.
    if ((c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 127)
      controlChars++;
    if (c === 0xfffd) replacementChars++;
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff)
        loneSurrogates++;
      else i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      loneSurrogates++;
    }
    if (c > maxCodePoint) maxCodePoint = c;
  }
  let bytes = text.length;
  try {
    bytes = new TextEncoder().encode(text).length;
  } catch {}
  return {
    chars: text.length,
    bytes,
    nonAscii,
    controlChars,
    loneSurrogates,
    replacementChars,
    maxCodePoint,
    tags: TAG_PATTERNS.filter((tag) => text.includes(tag)),
  };
}

const MAX_FAILED_CAPTURES = 3;
const FAILED_STORAGE_KEY = "unorouter-failed-requests";

// In memory ONLY: written on every send, so persisting it would be a
// localStorage write per turn.
let pending: FailedRequestCapture | null = null;
let failed: FailedRequestCapture[] | null = null;
let failedSaveTimer: ReturnType<typeof setTimeout> | null = null;

function getFailed(): FailedRequestCapture[] {
  if (failed === null) {
    failed = [];
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(FAILED_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) failed = parsed;
      } catch {}
    }
  }
  return failed;
}

function saveFailed(): void {
  if (failedSaveTimer !== null || typeof localStorage === "undefined") return;
  failedSaveTimer = setTimeout(() => {
    failedSaveTimer = null;
    try {
      localStorage.setItem(FAILED_STORAGE_KEY, JSON.stringify(getFailed()));
    } catch {}
  }, SAVE_DEBOUNCE_MS);
}

export function stashOutgoingRequest(capture: FailedRequestCapture): void {
  pending = capture;
}

export function captureFailedRequest(detail: {
  status?: number | null;
  code?: string | null;
  requestId?: string | null;
  message?: string;
}): void {
  if (!pending) return;
  const entries = getFailed();
  entries.push({ ...pending, ...detail });
  pending = null;
  if (entries.length > MAX_FAILED_CAPTURES)
    entries.splice(0, entries.length - MAX_FAILED_CAPTURES);
  saveFailed();
}

export function getFailedRequestCaptures(): FailedRequestCapture[] {
  return getFailed().slice();
}

export function clearFailedRequestCaptures(): void {
  failed = [];
  pending = null;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(FAILED_STORAGE_KEY);
    } catch {}
  }
}

export type CaughtErrorEntry = {
  ts: number;
  source: string;
  name: string;
  message: string;
  stack: string;
  componentStack: string;
  url: string;
  count: number;
  // The exception to the no-text rule: ONE message, never a transcript, and
  // kept on the NEWEST crash only.
  detail?: string;
  loadout?: CrashLoadout;
};

export type CrashLoadout = {
  convId: string | null;
  model: string | null;
  presetId: string | null;
  presetName: string | null;
  personaId: string | null;
  characterIds: string[];
  lorebookIds: string[];
  plugins: { name: string; kind: string; enabled: boolean; hooks: string[] }[];
};

const MAX_CAUGHT_ERRORS = 25;
const ERRORS_STORAGE_KEY = "unorouter-caught-errors";

let caught: CaughtErrorEntry[] | null = null;
let caughtSaveTimer: ReturnType<typeof setTimeout> | null = null;

function getCaught(): CaughtErrorEntry[] {
  if (caught === null) {
    if (typeof localStorage === "undefined") return (caught = []);
    try {
      const raw = localStorage.getItem(ERRORS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      caught = Array.isArray(parsed) ? parsed : [];
    } catch {
      caught = [];
    }
  }
  return caught;
}

function saveCaught(): void {
  if (caughtSaveTimer !== null || typeof localStorage === "undefined") return;
  caughtSaveTimer = setTimeout(() => {
    caughtSaveTimer = null;
    try {
      localStorage.setItem(ERRORS_STORAGE_KEY, JSON.stringify(getCaught()));
    } catch {}
  }, SAVE_DEBOUNCE_MS);
}

const MAX_DETAIL_CHARS = 20_000;

export function captureCaughtError(detail: {
  source: string;
  error: unknown;
  componentStack?: string | null;
  detail?: string | null;
  loadout?: CrashLoadout | null;
}): void {
  const err = detail.error;
  const isError = err instanceof Error;
  const name = isError ? err.name : typeof err;
  const message = String(isError ? err.message : err).slice(0, 500);
  const entries = getCaught();
  const last = entries[entries.length - 1];
  if (last && last.source === detail.source && last.message === message) {
    last.count++;
    last.ts = Date.now();
    saveCaught();
    return;
  }
  for (const e of entries) {
    delete e.detail;
    delete e.loadout;
  }
  entries.push({
    ts: Date.now(),
    source: detail.source,
    name,
    message,
    stack: (isError ? (err.stack ?? "") : "")
      .split("\n")
      .slice(0, 12)
      .join("\n"),
    componentStack: (detail.componentStack ?? "")
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 12)
      .join("\n"),
    url: typeof location === "undefined" ? "" : location.pathname,
    count: 1,
    ...(detail.detail
      ? { detail: detail.detail.slice(0, MAX_DETAIL_CHARS) }
      : {}),
    ...(detail.loadout ? { loadout: detail.loadout } : {}),
  });
  if (entries.length > MAX_CAUGHT_ERRORS)
    entries.splice(0, entries.length - MAX_CAUGHT_ERRORS);
  saveCaught();
}

export function getCaughtErrors(): CaughtErrorEntry[] {
  return getCaught().slice();
}

export function attachCrashLoadout(loadout: CrashLoadout): void {
  const entries = getCaught();
  const last = entries[entries.length - 1];
  if (!last) return;
  last.loadout = loadout;
  saveCaught();
}

export function clearCaughtErrors(): void {
  caught = [];
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(ERRORS_STORAGE_KEY);
    } catch {}
  }
}

export function clearChatDebugLog(): void {
  buffer = [];
  persistDisabled = false;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
