export type ChatDebugEntry = {
  ts: number;
  event: string;
  tab?: string;
  [key: string]: unknown;
};

// Which page wrote a line. Two tabs share one localStorage key, and an export
// taken from the healthy tab is the only record of the stuck one.
const TAB = Math.random().toString(36).slice(2, 6);

export function chatDebugTab(): string {
  return TAB;
}

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
const MAX_PERSISTED_ENTRIES = 200;
const SAVE_DEBOUNCE_MS = 1000;

// Each log is lazily read once (getItem + parse blocks, and the chat runtime
// imports this module on every page load) then written on a debounce, because
// setItem is synchronous and scales with SERIALIZED size: a full 2000-entry
// buffer (~400KB) parks the main thread for seconds per write.
function makeLog<T extends { ts: number; tab?: string }>(
  key: string,
  cap: number,
  persistCap = cap,
) {
  let items: T[] | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disabled = false;

  const stored = (): T[] => {
    if (typeof localStorage === "undefined") return [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  const get = (): T[] => {
    if (items === null) items = stored();
    return items;
  };

  // Every tab writes the whole array back, so without this the last tab to
  // save erases what the others logged since it loaded.
  const merged = (): T[] => {
    const mine = get().filter((e) => e.tab === TAB);
    const theirs = stored().filter((e) => e.tab !== TAB);
    const all = [...theirs, ...mine].sort((a, b) => a.ts - b.ts);
    return all.slice(-cap);
  };

  const write = (): void => {
    const all = merged();
    items = all;
    localStorage.setItem(key, JSON.stringify(all.slice(-persistCap)));
  };

  const save = (): void => {
    if (timer !== null || disabled || typeof localStorage === "undefined")
      return;
    timer = setTimeout(() => {
      timer = null;
      try {
        write();
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
    all: merged,
    save,
    // Synchronous write for pagehide: the debounce above loses whatever was
    // logged in the last second before a kill, which on a reload storm is the
    // one second that mattered.
    flush(): void {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (disabled || typeof localStorage === "undefined") return;
      try {
        write();
      } catch {}
    },
    push(entry: T): void {
      entry.tab = TAB;
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

// A main thread that hangs inside the save debounce never writes the line
// that preceded the hang, which is the one line that mattered. These are rare
// enough for a synchronous write each.
const FLUSH_NOW =
  /^(nav\.click|db\.open|db\.handover|db\.park|db\.gated|db\.worker|sw\.|import\.)/;

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
  if (FLUSH_NOW.test(event)) debugLog.flush();
}

export function flushChatDebugLog(): void {
  debugLog.flush();
}

export function getChatDebugLog(): ChatDebugEntry[] {
  return debugLog.all();
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
  tab?: string;
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
  return failedLog.all();
}

export function clearFailedRequestCaptures(): void {
  failedLog.clear();
  pending = null;
}

export type CaughtErrorEntry = {
  ts: number;
  tab?: string;
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
  if (
    last &&
    last.tab === TAB &&
    last.source === detail.source &&
    last.message === message
  ) {
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
  return caughtLog.all();
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
