import type { App } from "@/app/api/[[...route]]/route";
import { treaty, type Treaty } from "@elysiajs/eden";

export const rpc: Treaty.Create<App> = treaty<App>(
  typeof window === "undefined"
    ? `http://localhost:${process.env.PORT ?? "3000"}`
    : window.location.origin,
  { fetch: { credentials: "include" } },
);
