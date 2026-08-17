"use client";

import { getLocalDb } from "@/lib/db/client/client";
import { env } from "@/lib/config/env";
import { Studio } from "@libsqlstudio/gui";
import {
  SqliteLikeBaseDriver,
  type DatabaseResultSet,
  type Statement,
} from "@libsqlstudio/gui/driver";

export default function LocalDbStudioInner() {
  const driver = new SqlocalDriver();
  return (
    <Studio
      driver={driver}
      name={env.appName.toLowerCase()}
      color="indigo"
      theme="dark"
    />
  );
}

class SqlocalDriver extends SqliteLikeBaseDriver {
  supportBigInt() {
    return false;
  }

  async query(stmt: Statement) {
    return runOne(stmt);
  }

  async transaction(stmts: Statement[]) {
    const out: DatabaseResultSet[] = [];
    for (const s of stmts) out.push(await runOne(s));
    return out;
  }
}

async function runOne(stmt: Statement): Promise<DatabaseResultSet> {
  const local = await getLocalDb();
  if (!local) throw new Error("SQLocal unavailable");
  const sql = typeof stmt === "string" ? stmt : stmt.sql;
  const rawArgs = typeof stmt === "string" ? [] : (stmt.args ?? []);
  const params = Array.isArray(rawArgs) ? rawArgs : Object.values(rawArgs);
  const rs = await local.exec(sql, params, "all");
  const columns = rs.columns ?? [];
  return {
    rows: (rs.rows ?? []).map((tuple) =>
      Object.fromEntries(columns.map((c, i) => [c, tuple[i]])),
    ),
    headers: columns.map((name) => ({
      name,
      displayName: name,
      originalType: null,
      type: 1 as const,
    })),
    rowsAffected: rs.numAffectedRows ?? 0,
  };
}
