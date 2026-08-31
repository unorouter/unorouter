#!/usr/bin/env bun
// Ed25519 keypair for Web Bot Auth.
// Outputs: WEB_BOT_AUTH_PUBLIC_JWKS (served at .well-known) + WEB_BOT_AUTH_PRIVATE_JWK (secret).
// Usage: bun scripts/generate-web-bot-auth-key.ts

import { log } from "console";
import { jwkToKeyID } from "web-bot-auth";

// web-bot-auth 0.2 stopped exporting `helpers`, but jwkToKeyID still takes the
// same hash and decode callbacks, so these are its two former implementations.
const sha256 = (b: BufferSource) => crypto.subtle.digest("SHA-256", b);
const base64UrlDecode = (buf: ArrayBuffer) =>
  Buffer.from(new Uint8Array(buf)).toString("base64url");

async function main() {
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);

  const publicJwk = (await crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey,
  )) as JsonWebKey;
  const privateJwk = (await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  )) as JsonWebKey;

  const kid = await jwkToKeyID(publicJwk, sha256, base64UrlDecode);

  const now = Math.floor(Date.now() / 1000);
  const oneYear = 60 * 60 * 24 * 365;

  const publicEntry = {
    kty: publicJwk.kty,
    crv: publicJwk.crv,
    x: publicJwk.x,
    kid,
    use: "sig",
    alg: "EdDSA",
    nbf: now,
    exp: now + oneYear,
  };

  const privateEntry = { ...privateJwk, kid, use: "sig", alg: "EdDSA" };

  const jwks = { keys: [publicEntry] };

  log("# Paste the following into your environment (.env, Railway, etc.)\n");
  log(`WEB_BOT_AUTH_PUBLIC_JWKS='${JSON.stringify(jwks)}'`);
  log();
  log(`WEB_BOT_AUTH_PRIVATE_JWK='${JSON.stringify(privateEntry)}'`);
  log();
  log(`# Key ID (thumbprint): ${kid}`);
  log(
    `# Valid until:         ${new Date((now + oneYear) * 1000).toISOString()}`,
  );
}

await main();

export {};
