"use client";

// ---------------------------------------------------------------------------
// LibSQL Studio + SQLocal driver glue. Imported lazily by local-db-studio.tsx
// via `next/dynamic` so the ~107 KB Studio bundle only ships when the user
// actually opens the panel.
// ---------------------------------------------------------------------------

import { getLocalDb } from "@/lib/local-db/client";
import { Studio } from "@libsqlstudio/gui";
import {
  SqliteLikeBaseDriver,
  type DatabaseResultSet,
  type Statement,
} from "@libsqlstudio/gui/driver";
import { useMemo } from "react";

export default function LocalDbStudioInner(props: { userId: number }) {
  const driver = useMemo(() => new SqlocalDriver(props.userId), [props.userId]);
  return (
    <Studio
      driver={driver}
      name={`unorouter-${props.userId}`}
      color="indigo"
      theme="dark"
    />
  );
}

class SqlocalDriver extends SqliteLikeBaseDriver {
  private userId: number;

  constructor(userId: number) {
    super();
    this.userId = userId;
  }

  supportBigInt(): boolean {
    return false;
  }

  async query(stmt: Statement): Promise<DatabaseResultSet> {
    return runOne(this.userId, stmt);
  }

  async transaction(stmts: Statement[]): Promise<DatabaseResultSet[]> {
    const out: DatabaseResultSet[] = [];
    for (const s of stmts) out.push(await runOne(this.userId, s));
    return out;
  }
}

async function runOne(
  userId: number,
  stmt: Statement,
): Promise<DatabaseResultSet> {
  const local = await getLocalDb(userId);
  if (!local) throw new Error("SQLocal unavailable");
  const sql = typeof stmt === "string" ? stmt : stmt.sql;
  const args = typeof stmt === "string" ? [] : (stmt.args ?? []);
  const params = Array.isArray(args) ? args : Object.values(args);
  const rs = await local.exec(sql, params, "all");
  const columns = rs.columns ?? [];
  const rows: Record<string, unknown>[] = (rs.rows ?? []).map((tuple) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) obj[columns[i]] = tuple[i];
    return obj;
  });
  const headers = columns.map((name) => ({
    name,
    displayName: name,
    originalType: null,
    type: 1 as 1 | 2 | 3 | 4,
  }));
  return {
    rows,
    headers,
    rowsAffected: rs.numAffectedRows ?? 0,
  };
}
