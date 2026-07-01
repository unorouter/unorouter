// Chat debug ring buffer. localStorage (not OPFS, the subsystem under test) so it survives the
// reloads that are themselves repro steps, and works synchronously from non-React callers.
export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 2000;
const MAX_ENTRY_BYTES = 10_000;
const STORAGE_KEY = "unorouter-chat-debug-log";

let buffer: ChatDebugEntry[] = load();
let saveQueued = false;

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

// Coalesce writes to one per tick: a burst of log calls in a render does a single serialize.
function save(): void {
  if (saveQueued || typeof localStorage === "undefined") return;
  saveQueued = true;
  queueMicrotask(() => {
    saveQueued = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
    } catch {
      // quota/serialization failure: keep the in-memory buffer, skip persisting.
    }
  });
}

export function logChatDebug(
  event: string,
  data?: Record<string, unknown>,
): void {
  // Cap per-entry size: a huge payload (a prompt snapshot, a giant error) must not bloat the
  // localStorage log or the diagnostics export it rides in. Keep a tiny summary instead.
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
