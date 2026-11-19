import { contactBody } from "@/lib/api/typebox/common";
import { unwrap } from "@/lib/utils/base";
import { sendContactMessage } from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import { Elysia } from "elysia";

export const contactRoute = new Elysia({ prefix: "/contact" })
  .derive(deriveUpstream)
  .post(
    "/",
    async ({ body, upstream }) => {
      const { turnstile, ...request } = body;
      return unwrap(await sendContactMessage(request, { turnstile }, upstream));
    },
    { body: contactBody },
  );
