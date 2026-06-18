// Always-on chat debug ring buffer for diagnosing chat bugs (e.g. the iOS chat-merge race).
// A user reproduces an issue then exports the log via the chat Import/Export/Debug menu.
//
// PERSISTED to localStorage: refreshing is itself a repro step for some bugs (chat merge), so an
// in-memory buffer would be wiped before export. Survives reloads so the export covers before AND
// after the refresh. NOT in OPFS/SQLocal (that DB is the subsystem under test); localStorage is
// independent + synchronous, so it also works from non-React callers without a hydration race.

export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 500;
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

export function logChatDebug(event: string, data?: Record<string, unknown>): void {
  buffer.push({ ts: Date.now(), event, ...data });
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
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
    } catch {
      // ignore
    }
  }
}
