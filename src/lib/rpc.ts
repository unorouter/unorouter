import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...route]]/route";

export const rpc = treaty<App>(
  typeof window === "undefined"
    ? `http://localhost:${process.env.PORT ?? 3000}`
    : window.location.origin,
);
