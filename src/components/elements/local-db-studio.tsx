"use client";

// ---------------------------------------------------------------------------
// Dev-only inline browser for the on-device SQLocal database. Embeds the
// LibSQL Studio React component (`@libsqlstudio/gui`) with a custom driver
// that talks to our SQLocal worker. No third-party origin, no extra service:
// data never leaves the page. Compiles to a no-op in production builds via
// the NODE_ENV guard.
// ---------------------------------------------------------------------------

import { useAuthQuery } from "@/hooks/auth-hook";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getLocalDb } from "@/lib/local-db/client";
import { Studio } from "@libsqlstudio/gui";
import "@libsqlstudio/gui/css";
import {
  SqliteLikeBaseDriver,
  type DatabaseResultSet,
  type Statement,
} from "@libsqlstudio/gui/driver";
import { useMemo, useState } from "react";
import { LuDatabase } from "react-icons/lu";

export function LocalDbStudio() {
  if (process.env.NODE_ENV === "production") return null;
  return <LocalDbStudioInner />;
}

function LocalDbStudioInner() {
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? 0;
  const [open, setOpen] = useState(false);

  const driver = useMemo(() => new SqlocalDriver(userId), [userId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Local DB Studio"
            className="fixed right-4 bottom-4 z-50 size-10 rounded-full shadow-lg"
          >
            <LuDatabase className="size-4" />
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="w-[min(95vw,1400px)]! max-w-none! p-0"
      >
        <SheetTitle className="sr-only">Local DB Studio</SheetTitle>
        <div className="size-full">
          <Studio
            driver={driver}
            name={`unorouter-${userId}`}
            color="indigo"
            theme="dark"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

class SqlocalDriver extends SqliteLikeBaseDriver {
  private userId: number;

  constructor(userId: number) {
    super();
    this.userId = userId;
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
  // SQLocal exposes drizzle's sqlite-proxy via local.db.run. Use sql template
  // directly via the underlying processor since we may receive raw SQL plus
  // positional args from Studio.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rs = (await (local.db as any).run(sql, Array.isArray(args) ? args : Object.values(args))) as {
    rows?: unknown[][] | Record<string, unknown>[];
    columns?: string[];
    rowsAffected?: number;
    lastInsertRowid?: number | bigint;
  };
  const raw = rs.rows ?? [];
  let columns = rs.columns ?? [];
  let rows: Record<string, unknown>[] = [];
  if (raw.length > 0 && Array.isArray(raw[0])) {
    rows = (raw as unknown[][]).map((tuple) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) obj[columns[i]] = tuple[i];
      return obj;
    });
  } else if (raw.length > 0) {
    rows = raw as Record<string, unknown>[];
    if (columns.length === 0) columns = Object.keys(rows[0]);
  }
  const headers = columns.map((name) => ({
    name,
    displayName: name,
    originalType: null,
    type: 1, // TableColumnDataType.TEXT - studio re-infers from values
  }));
  return {
    rows,
    headers,
    rowsAffected: rs.rowsAffected ?? 0,
    lastInsertRowid:
      typeof rs.lastInsertRowid === "bigint"
        ? Number(rs.lastInsertRowid)
        : rs.lastInsertRowid,
  };
}
