import { statsRoute } from "@/server/stats/route";
import { Elysia } from "elysia";

export const app = new Elysia({ prefix: "/api" }).use(statsRoute);

export type App = typeof app;

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
