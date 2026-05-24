import { SYNC_KINDS, type SyncKindName } from "@/lib/validation/sync";
import { listSyncState } from "./kinds";

type SyncStateRow = {
  id: string;
  syncExpiresAt: Date | null;
  updatedAt: Date;
};

export type SyncStateBulk = Record<SyncKindName, SyncStateRow[]>;

export async function getSyncStateBulk(userId: number): Promise<SyncStateBulk> {
  const entries = await Promise.all(
    SYNC_KINDS.map(
      async (kind) => [kind, await listSyncState(userId, kind)] as const,
    ),
  );
  return Object.fromEntries(entries) as SyncStateBulk;
}
