// Opt-in chat debug ring buffer. Off by default (zero overhead); a user enables it via the
// chat Debug menu, reproduces an issue, then downloads diagnostics. Reusable for any chat bug.
// `enabled` is a plain module flag mirrored from debugLoggingEnabledAtom (client-store) by the
// effect in ChatRuntimeProvider so logChatDebug stays synchronous for non-React callers.
//
// PERSISTED to localStorage: refreshing the page is itself a repro step for some bugs (chat
// merge), and an in-memory buffer would be wiped on reload before the user can export. The
// buffer survives reloads so the export covers before AND after the refresh. NOT in OPFS/SQLocal
// (that DB is often the subsystem under test); localStorage is independent + synchronous.

export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 500;
const STORAGE_KEY = "unorouter-chat-debug-log";

let buffer: ChatDebugEntry[] = load();
let enabled = false;
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

export function setChatDebugEnabled(value: boolean): void {
  enabled = value;
}

export function isChatDebugEnabled(): boolean {
  return enabled;
}

export function logChatDebug(event: string, data?: Record<string, unknown>): void {
  if (!enabled) return;
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
