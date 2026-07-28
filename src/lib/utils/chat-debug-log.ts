export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
const STORAGE_KEY = "unorouter-chat-debug-log";

let buffer: ChatDebugEntry[] = load();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

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

// Persisting the whole ring buffer means a full JSON.stringify + a SYNCHRONOUS
// localStorage.setItem. A per-microtask flush let a high-frequency caller (e.g.
// a per-frame viewport/streaming log) run that heavy write on every frame and
// froze the main thread. Debounce to a single trailing write so any burst
// coalesces into one serialize+store.
const SAVE_DEBOUNCE_MS = 1000;

function save(): void {
  if (saveTimer !== null || typeof localStorage === "undefined") return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
    } catch {}
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
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES)
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  save();
}

export function getChatDebugLog(): ChatDebugEntry[] {
  return buffer.slice();
}

export function clearChatDebugLog(): void {
  buffer = [];
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
