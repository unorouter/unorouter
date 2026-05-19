"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { migrateGuestLocalDb } from "@/lib/db/client/migrate/guest-migrate";
import { logger } from "@/lib/utils/logger";
import { useEffect, useRef } from "react";

export function GuestLocalDbMigrate() {
  const auth = useAuthQuery();
  const fired = useRef(false);

  useEffect(() => {
    const userId = auth.data?.id;
    if (!userId || fired.current) return;
    fired.current = true;
    void migrateGuestLocalDb(userId).catch((err) =>
      logger.warn("Guest local DB migration failed", {
        context: "local-db.guest-migrate",
        error: String(err),
      }),
    );
  }, [auth.data]);

  return null;
}
