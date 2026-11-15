import type { App } from "@/app/api/[[...route]]/route";
import { treaty } from "@elysiajs/eden";

export const rpc = treaty<App>(
  typeof window === "undefined"
    ? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
    : window.location.origin,
  // Eden otherwise turns any date-shaped string into a Date, so a token named
  // "2026-11-15" reached React as an object and crashed the page.
  { fetch: { credentials: "include" }, parseDate: false },
);
