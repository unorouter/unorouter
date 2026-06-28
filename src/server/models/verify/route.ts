import { verifyProbeBody } from "@/lib/api/typebox/verify";
import { Elysia } from "elysia";
import { forwardProbe } from "./proxy.service";

export const verifyRoute = new Elysia({ prefix: "/verify" }).post(
  "/probe",
  async ({ body }) => {
    return { success: true, data: await forwardProbe(body) };
  },
  { body: verifyProbeBody },
);
