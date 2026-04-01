import { serverEnv } from "@/server/env";
import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...route]]/route";

export const rpc = treaty<App>(
  typeof window === "undefined"
    ? `http://localhost:${serverEnv.port}`
    : window.location.origin,
  {
    fetch: { credentials: "include" },
  },
);
