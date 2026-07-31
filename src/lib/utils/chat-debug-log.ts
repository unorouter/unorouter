export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
// Only the newest slice is persisted. localStorage.setItem is synchronous, and
// in Firefox it blocks the content process on an IPC round-trip to the parent
// (LocalStorage NextGen), so the cost scales with the SERIALIZED size, not the
// entry count. A saturated 2000-entry buffer is ~400KB per write: enough to
// park the main thread for whole seconds on a chat page, with input queuing up
// and replaying in a burst. Persist a bounded tail so the write stays small
// while the in-memory buffer keeps full history for this session's export.
const MAX_PERSISTED_ENTRIES = 200;
const STORAGE_KEY = "unorouter-chat-debug-log";

let buffer: ChatDebugEntry[] | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistDisabled = false;

// Lazy, NOT at module init: load() is a synchronous getItem + JSON.parse of the
// stored blob, and this module is imported by the chat runtime, so eager
// loading put that blocking read on the critical path of every page load.
// Nothing needs prior-session entries until something actually logs or exports.
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

// Debounce to a single trailing write so any burst coalesces into one
// serialize+store; a per-microtask flush once ran the write on every frame.
const SAVE_DEBOUNCE_MS = 1000;

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
      // Over quota (or storage blocked): drop the stored copy and stop trying.
      // Retrying every second would burn a synchronous write per attempt for a
      // value that can never land, and the in-memory buffer still serves the
      // diagnostics export for this session.
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
