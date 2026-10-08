const LAST_BACKUP_KEY = "unorouter-last-backup-at";
const SNOOZE_KEY = "unorouter-backup-snooze-until";
const INTERVAL_KEY = "unorouter-backup-reminder-days";
const DAY_MS = 86_400_000;

export type BackupState = {
  lastBackupAt: number | null;
  snoozedUntil: number;
  // 0 turns the reminder off.
  intervalDays: number;
};

export const REMINDER_INTERVALS = [1, 3, 7, 0] as const;

function readNumber(key: string): number | null {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function write(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

export function readBackupState(): BackupState {
  return {
    lastBackupAt: readNumber(LAST_BACKUP_KEY),
    snoozedUntil: readNumber(SNOOZE_KEY) ?? 0,
    intervalDays: readInterval(),
  };
}

export function markBackedUp(): void {
  write(LAST_BACKUP_KEY, Date.now());
}

function readInterval(): number {
  try {
    const stored = localStorage.getItem(INTERVAL_KEY);
    return stored === null ? 1 : Number(stored) || 0;
  } catch {
    return 1;
  }
}

export function setReminderInterval(days: number): void {
  try {
    localStorage.setItem(INTERVAL_KEY, String(days));
  } catch {}
}

export function snoozeBackupReminder(): void {
  write(SNOOZE_KEY, Date.now() + Math.max(1, readInterval()) * DAY_MS);
}

export function backupAgeDays(state: BackupState, now: number): number | null {
  return state.lastBackupAt === null
    ? null
    : Math.floor((now - state.lastBackupAt) / DAY_MS);
}

export function backupIsDue(state: BackupState, now: number): boolean {
  if (state.intervalDays === 0 || state.snoozedUntil > now) return false;
  return (
    state.lastBackupAt === null ||
    now - state.lastBackupAt > state.intervalDays * DAY_MS
  );
}
