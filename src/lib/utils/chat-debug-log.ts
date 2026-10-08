export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
const MAX_PERSISTED_ENTRIES = 200;
const SAVE_DEBOUNCE_MS = 1000;
const MAX_DB_ENTRIES = 400;
const MAX_TIMING_ENTRIES = 200;
const TAB_ID = Math.random().toString(36).slice(2, 8);

// Each log is lazily read once (getItem + parse blocks, and the chat runtime
// imports this module on every page load) then written on a debounce, because
// setItem is synchronous and scales with SERIALIZED size: a full 2000-entry
// buffer (~400KB) parks the main thread for seconds per write.
// Every tab writes the same key, so a plain write keeps only the last writer's
// entries. `shared` re-reads the key and keeps the other tabs' entries.
function makeLog<T extends { tab?: string; ts: number }>(
  key: string,
  cap: number,
  persistCap = cap,
  shared = false,
) {
  let items: T[] | null = null;
  const stored = (): T[] => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const persisted = (): T[] => {
    const mine = (items ?? []).slice(-persistCap);
    if (!shared) return mine;
    return stored()
      .filter((e) => e.tab !== TAB_ID)
      .concat(mine)
      .sort((a, b) => a.ts - b.ts)
      .slice(-persistCap);
  };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disabled = false;

  const get = (): T[] => {
    if (items !== null) return items;
    items = [];
    if (typeof localStorage === "undefined") return items;
    items = shared ? stored().filter((e) => e.tab === TAB_ID) : stored();
    return items;
  };

  const save = (): void => {
    if (timer !== null || disabled || typeof localStorage === "undefined")
      return;
    timer = setTimeout(() => {
      timer = null;
      try {
        get();
        localStorage.setItem(key, JSON.stringify(persisted()));
      } catch {
        // Over quota or blocked: latch off, a sync write per second cannot land.
        disabled = true;
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }, SAVE_DEBOUNCE_MS);
  };

  return {
    get,
    save,
    // Synchronous write for pagehide: the debounce above loses whatever was
    // logged in the last second before a kill, which on a reload storm is the
    // one second that mattered.
    flush(): void {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (disabled || typeof localStorage === "undefined") return;
      try {
        get();
        localStorage.setItem(key, JSON.stringify(persisted()));
      } catch {}
    },
    push(entry: T): void {
      const all = get();
      all.push(entry);
      if (all.length > cap) all.splice(0, all.length - cap);
      save();
    },
    clear(): void {
      items = [];
      disabled = false;
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}

const debugLog = makeLog<ChatDebugEntry>(
  "unorouter-chat-debug-log",
  MAX_ENTRIES,
  MAX_PERSISTED_ENTRIES,
);
// The chat log's 200 persisted entries are minutes of viewport noise, and a
// pool can be wiped by a tab other than the one that exports.
const dbLog = makeLog<ChatDebugEntry>(
  "unorouter-db-debug-log",
  MAX_DB_ENTRIES,
  MAX_DB_ENTRIES,
  true,
);
const timingLog = makeLog<ChatDebugEntry>(
  "unorouter-stream-timing-log",
  MAX_TIMING_ENTRIES,
  MAX_TIMING_ENTRIES,
  true,
);

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
  debugLog.push(entry);
  if (event.startsWith("db.")) dbLog.push({ ...entry, tab: TAB_ID });
  if (event === "stream.timing") timingLog.push({ ...entry, tab: TAB_ID });
}

export function flushChatDebugLog(): void {
  debugLog.flush();
  dbLog.flush();
  timingLog.flush();
}

// Every tab's entries, oldest first.
function readShared(log: typeof dbLog, key: string): ChatDebugEntry[] {
  log.flush();
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : log.get().slice();
  } catch {
    return log.get().slice();
  }
}

export function getDbDebugLog(): ChatDebugEntry[] {
  return readShared(dbLog, "unorouter-db-debug-log");
}

export function getStreamTimingLog(): ChatDebugEntry[] {
  return readShared(timingLog, "unorouter-stream-timing-log");
}

export function getChatDebugLog(): ChatDebugEntry[] {
  return debugLog.get().slice();
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
const failedLog = makeLog<FailedRequestCapture>(
  "unorouter-failed-requests",
  MAX_FAILED_CAPTURES,
);

// In memory ONLY: written on every send, so persisting it would be a
// localStorage write per turn.
let pending: FailedRequestCapture | null = null;

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
  failedLog.push({ ...pending, ...detail });
  pending = null;
}

export function getFailedRequestCaptures(): FailedRequestCapture[] {
  return failedLog.get().slice();
}

export function clearFailedRequestCaptures(): void {
  failedLog.clear();
  pending = null;
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
const caughtLog = makeLog<CaughtErrorEntry>(
  "unorouter-caught-errors",
  MAX_CAUGHT_ERRORS,
);

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
  const entries = caughtLog.get();
  const last = entries[entries.length - 1];
  if (last && last.source === detail.source && last.message === message) {
    last.count++;
    last.ts = Date.now();
    caughtLog.save();
    return;
  }
  for (const e of entries) {
    delete e.detail;
    delete e.loadout;
  }
  caughtLog.push({
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
}

export function getCaughtErrors(): CaughtErrorEntry[] {
  return caughtLog.get().slice();
}

export function attachCrashLoadout(loadout: CrashLoadout): void {
  const entries = caughtLog.get();
  const last = entries[entries.length - 1];
  if (!last) return;
  last.loadout = loadout;
  caughtLog.save();
}

export function clearCaughtErrors(): void {
  caughtLog.clear();
}

export function clearChatDebugLog(): void {
  debugLog.clear();
}
