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

export function clearChatDebugLog(): void {
  buffer = [];
  persistDisabled = false;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
