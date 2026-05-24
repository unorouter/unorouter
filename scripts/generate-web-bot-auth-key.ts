#!/usr/bin/env bun
// Ed25519 keypair for Web Bot Auth.
// Outputs: WEB_BOT_AUTH_PUBLIC_JWKS (served at .well-known) + WEB_BOT_AUTH_PRIVATE_JWK (secret).
// Usage: bun scripts/generate-web-bot-auth-key.ts

import { log } from "console";
import { jwkToKeyID } from "web-bot-auth";
import { helpers } from "web-bot-auth/crypto";

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

  const kid = await jwkToKeyID(
    publicJwk,
    helpers.WEBCRYPTO_SHA256,
    helpers.BASE64URL_DECODE,
  );

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
