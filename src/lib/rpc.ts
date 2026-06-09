import type { App } from "@/app/api/[[...route]]/route";
import { treaty } from "@elysiajs/eden";

export const rpc = treaty<App>(
  // 127.0.0.1, not localhost: in the prod container localhost resolves to ::1
  // but the Next server binds IPv4 only, so server-side self-calls (sitemap
  // pricing, SSR fetches) silently return empty.
  typeof window === "undefined"
    ? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
    : window.location.origin,
  { fetch: { credentials: "include" } },
);
