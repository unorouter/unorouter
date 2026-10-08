const LAST_BACKUP_KEY = "unorouter-last-backup-at";
const SNOOZE_KEY = "unorouter-backup-snooze-until";
const DAY_MS = 86_400_000;

export type BackupState = {
  lastBackupAt: number | null;
  snoozedUntil: number;
};

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
  };
}

export function markBackedUp(): void {
  write(LAST_BACKUP_KEY, Date.now());
}

export function snoozeBackupReminder(days = 1): void {
  write(SNOOZE_KEY, Date.now() + days * DAY_MS);
}

export function backupAgeDays(state: BackupState, now: number): number | null {
  return state.lastBackupAt === null
    ? null
    : Math.floor((now - state.lastBackupAt) / DAY_MS);
}

export function backupIsDue(state: BackupState, now: number): boolean {
  return state.lastBackupAt === null || now - state.lastBackupAt > 3 * DAY_MS;
}
