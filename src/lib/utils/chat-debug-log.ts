// Opt-in chat debug ring buffer. Off by default (zero overhead); a user enables it via the
// chat Debug menu, reproduces an issue, then downloads diagnostics. Reusable for any chat bug.
// `enabled` is a plain module flag mirrored from debugLoggingEnabledAtom (client-store) by
// DebugLoggingSync so logChatDebug stays synchronous for non-React callers.

export type ChatDebugEntry = {
  ts: number;
  event: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 500;
const buffer: ChatDebugEntry[] = [];
let enabled = false;

export function setChatDebugEnabled(value: boolean): void {
  if (value && !enabled) buffer.length = 0; // fresh session on enable
  enabled = value;
}

export function isChatDebugEnabled(): boolean {
  return enabled;
}

export function logChatDebug(event: string, data?: Record<string, unknown>): void {
  if (!enabled) return;
  buffer.push({ ts: Date.now(), event, ...data });
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
}

export function getChatDebugLog(): ChatDebugEntry[] {
  return buffer.slice();
}

export function clearChatDebugLog(): void {
  buffer.length = 0;
}
