import type * as shared from "@/lib/db/schema/shared";
import type { LocalClient, LocalRawExec } from "@/lib/types";

declare module "sqlocal/drizzle" {
  interface SQLocalDrizzle {
    exec: LocalRawExec;
    reactiveQuery: LocalClient["reactiveQuery"];
  }
}

declare global {
  interface Window {
    __local?: LocalClient;
    __shared?: typeof shared;
    __sqlocal?: import("sqlocal/drizzle").SQLocalDrizzle;
  }
}

export {};
