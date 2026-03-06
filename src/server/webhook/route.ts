import { Elysia } from "elysia";
import crypto from "node:crypto";
import { Resend } from "resend";

export const webhookRoute = new Elysia({ prefix: "/webhook" }).post(
  "/resend",
  async ({ request, set }) => {
    if (!process.env.RESEND_WEBHOOK_SECRET) {
      set.status = 500;
      return { error: "Webhook secret not configured" };
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      set.status = 400;
      return { error: "Missing svix headers" };
    }

    const rawBody = await request.text();

    const secretBytes = Buffer.from(process.env.RESEND_WEBHOOK_SECRET.split("_")[1], "base64");
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const signatures = svixSignature.split(" ");
    const isValid = signatures.some((sig) => {
      const sigValue = sig.split(",")[1];
      return sigValue === expectedSignature;
    });

    if (!isValid) {
      set.status = 401;
      return { error: "Invalid signature" };
    }

    const event = JSON.parse(rawBody);

    if (event.type === "email.received") {
      const { from, to, subject, email_id } = event.data;

      try {
        if (!process.env.RESEND_API_KEY) {
          throw new Error("RESEND_API_KEY is not set");
        }
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data: email } = await resend.emails.get(email_id);
        const originalTo = Array.isArray(to) ? to.join(", ") : to;

        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: process.env.RESEND_FORWARD_TO,
          subject: `[${originalTo}] ${subject ?? "(no subject)"}`,
          text: email?.text ?? `(empty email from ${from})`,
          html: email?.html ?? undefined,
          replyTo: from,
        });
      } catch (error) {
        console.error("Email forward failed:", error);
        set.status = 500;
        return { error: "Failed to forward" };
      }
    }

    return { received: true };
  },
  {
    parse: () => {}, // Skip Elysia's body parsing, read raw from request
  },
);
