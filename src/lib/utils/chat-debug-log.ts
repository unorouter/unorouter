export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
// Persist a bounded tail, not the whole buffer: setItem is synchronous and its
// cost scales with SERIALIZED size, so a saturated 2000-entry buffer (~400KB)
// parked the main thread for seconds per write. Memory keeps full history.
const MAX_PERSISTED_ENTRIES = 200;
const SAVE_DEBOUNCE_MS = 1000;
const STORAGE_KEY = "unorouter-chat-debug-log";

let buffer: ChatDebugEntry[] | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistDisabled = false;

// Lazy, NOT at module init: load() is a blocking getItem + JSON.parse, and the
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

// Debounced so a burst coalesces into one serialize+store.
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
      // Over quota or blocked: stop retrying, a sync write per second can never
      // land. The in-memory buffer still serves this session's export.
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

// NEVER put message text in here. A capture is exported into a file users paste
// into a public channel, and the assembled prompt is their persona, character
// cards, lorebook and recent turns: the most private content in the app.
//
// What a rejected-body bug actually needs is the SHAPE of the bytes, not the
// bytes. An upstream that 400s a payload its peers accept is reacting to
// something structural (an encoding artifact, a control character, an unpaired
// surrogate from a sliced emoji), and each of those is countable without
// reproducing a single word. Template tags are matched against a fixed list, so
// only known markers can ever appear, never user text.
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
    // Tab/LF/CR are normal prose; the rest of C0 plus DEL and the C1 block are
    // what a mangled re-encode leaves behind.
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

// Kept in memory, never localStorage: a capture is only useful in the export
// taken right after the failure, and the vast majority of sends succeed.
const MAX_FAILED_CAPTURES = 3;

let pending: FailedRequestCapture | null = null;
let failed: FailedRequestCapture[] = [];

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
  failed.push({ ...pending, ...detail });
  pending = null;
  if (failed.length > MAX_FAILED_CAPTURES)
    failed.splice(0, failed.length - MAX_FAILED_CAPTURES);
}

export function getFailedRequestCaptures(): FailedRequestCapture[] {
  return failed.slice();
}

export function clearFailedRequestCaptures(): void {
  failed = [];
  pending = null;
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
