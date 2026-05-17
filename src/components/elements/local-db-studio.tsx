"use client";

// ---------------------------------------------------------------------------
// Dev-only inline browser for the on-device SQLocal database. Embeds the
// LibSQL Studio React component (`@libsqlstudio/gui`) with a custom driver
// that talks to our SQLocal worker. Studio ships a Tailwind preflight that
// would hose our shadcn styles, so we mount it inside a shadow root and
// inject Studio's stylesheet only into that root. Compiles to a no-op in
// production builds via the NODE_ENV guard.
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
import {
  SqliteLikeBaseDriver,
  type DatabaseResultSet,
  type Statement,
} from "@libsqlstudio/gui/driver";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
        <ShadowHost className="size-full">
          <Studio
            driver={driver}
            name={`unorouter-${userId}`}
            color="indigo"
            theme="dark"
          />
        </ShadowHost>
      </SheetContent>
    </Sheet>
  );
}

// Mounts children inside an open shadow root so Studio's global Tailwind
// preflight stays scoped. Fetches the package CSS once and re-uses the
// constructable stylesheet across all instances.
// Stylesheet is copied to /public/sqlocal/studio.css by
// scripts/bundle-sqlocal-worker.ts on postinstall / prebuild.
const STUDIO_CSS_URL = "/sqlocal/studio.css";

let cachedSheet: CSSStyleSheet | null = null;
async function loadStudioStylesheet(): Promise<CSSStyleSheet> {
  if (cachedSheet) return cachedSheet;
  const res = await fetch(STUDIO_CSS_URL);
  // The CSS targets `:root` (Tailwind theme tokens), `.dark` (legacy dark
  // class), and Tailwind v3 `:is(.dark *)` (compiled dark variant). Inside
  // a shadow root none of those match a class on the shadow host because
  // descendant combinators don't cross the shadow boundary. Rewrite each to
  // target the host via `:host` / `:host(.dark)`.
  const text = (await res.text())
    .replace(/:root\b/g, ":host")
    // Tailwind v3 dark variants compile to e.g. `.dark\:bg-x:is(.dark *)`.
    // `:host-context()` would be the right thing but it's deprecated and
    // Chromium drops the whole rule when the qualifier is mid-selector.
    // We always mount the host with `dark`, so unconditionally enable the
    // dark utility by stripping the `:is(.dark *)` qualifier.
    .replace(/:is\(\.dark\s*\*\)/g, "")
    // Rewrite a bare `.dark` selector (or `.dark <descendant>`) to scope
    // onto the shadow host. Stop short of escaped Tailwind names like
    // `.dark\:bg-gray-900` by requiring a non-backslash next char.
    .replace(/(^|[^a-zA-Z_-])\.dark([^\w\\-]|$)/g, "$1:host(.dark)$2");
  const sheet = new CSSStyleSheet();
  await sheet.replace(text);
  cachedSheet = sheet;
  return sheet;
}

function ShadowHost(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const root =
      hostRef.current.shadowRoot ??
      hostRef.current.attachShadow({ mode: "open" });
    // The Studio stylesheet uses `.dark` (descendant selector) for the dark
    // theme. We want to control it via Studio's `theme="dark"` prop, which
    // expects the class on an ancestor. Add it to the shadow host so the
    // descendant rule matches all of Studio's tree.
    hostRef.current.classList.add("dark");
    let cancelled = false;
    void loadStudioStylesheet().then((sheet) => {
      if (cancelled) return;
      root.adoptedStyleSheets = [sheet];
      setShadow(root);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={hostRef} className={props.className}>
      {shadow && createPortal(props.children, shadow)}
    </div>
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
    type: 1,
  }));
  return {
    rows,
    headers,
    rowsAffected: rs.numAffectedRows ?? 0,
  };
}
