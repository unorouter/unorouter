import { NextResponse } from "next/server";
import crypto from "node:crypto";

const SIGNING_SECRET = process.env.RESEND_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!SIGNING_SECRET) {
    console.error("RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const body = await request.text();

  const secretBytes = Buffer.from(SIGNING_SECRET.split("_")[1], "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
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
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.type === "email.received") {
    const { from, to, subject, text, html } = event.data;
    console.log("Received email:", { from, to, subject });

    // TODO: Forward to your email or store in DB
  }

  return NextResponse.json({ received: true });
}
