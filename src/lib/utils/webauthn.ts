import { msg } from "@/lib/config/constants";
import {
  arrayBufferToBase64,
  base64ToUint8,
  isRecord,
  isOneOf,
} from "@/lib/utils/base";

// go-webauthn reads and writes binary fields as unpadded base64url.
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToUint8(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
}

function toBase64Url(buf: ArrayBuffer): string {
  return arrayBufferToBase64(buf)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function toRequestOptions(
  assertion: unknown,
): PublicKeyCredentialRequestOptions {
  const publicKey = isRecord(assertion) ? assertion.publicKey : undefined;
  if (!isRecord(publicKey) || typeof publicKey.challenge !== "string")
    throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  const allowCredentials = toCredentialDescriptors(publicKey.allowCredentials);
  return {
    challenge: fromBase64Url(publicKey.challenge),
    rpId: typeof publicKey.rpId === "string" ? publicKey.rpId : undefined,
    timeout:
      typeof publicKey.timeout === "number" ? publicKey.timeout : undefined,
    userVerification: toRequirement(publicKey.userVerification) ?? "required",
    allowCredentials,
  };
}

const isRequirement = isOneOf([
  "required",
  "preferred",
  "discouraged",
] as const);
const isAttestation = isOneOf([
  "none",
  "indirect",
  "direct",
  "enterprise",
] as const);
const toRequirement = (value: unknown) =>
  isRequirement(value) ? value : undefined;

function toCredentialDescriptors(
  value: unknown,
): PublicKeyCredentialDescriptor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((credential) =>
    isRecord(credential) && typeof credential.id === "string"
      ? [{ type: "public-key", id: fromBase64Url(credential.id) }]
      : [],
  );
}

function toCreationOptions(
  creation: unknown,
): PublicKeyCredentialCreationOptions {
  const publicKey = isRecord(creation) ? creation.publicKey : undefined;
  const rp = isRecord(publicKey) ? publicKey.rp : undefined;
  const user = isRecord(publicKey) ? publicKey.user : undefined;
  if (
    !isRecord(publicKey) ||
    typeof publicKey.challenge !== "string" ||
    !isRecord(rp) ||
    typeof rp.name !== "string" ||
    !isRecord(user) ||
    typeof user.id !== "string" ||
    typeof user.name !== "string"
  )
    throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  const params = Array.isArray(publicKey.pubKeyCredParams)
    ? publicKey.pubKeyCredParams
    : [];
  const pubKeyCredParams: PublicKeyCredentialParameters[] = params.flatMap(
    (param) =>
      isRecord(param) && typeof param.alg === "number"
        ? [{ type: "public-key", alg: param.alg }]
        : [],
  );
  const selection = isRecord(publicKey.authenticatorSelection)
    ? publicKey.authenticatorSelection
    : {};
  const attachment = selection.authenticatorAttachment;
  const attestation = publicKey.attestation;
  return {
    challenge: fromBase64Url(publicKey.challenge),
    rp: { name: rp.name, id: typeof rp.id === "string" ? rp.id : undefined },
    user: {
      id: fromBase64Url(user.id),
      name: user.name,
      displayName:
        typeof user.displayName === "string" ? user.displayName : user.name,
    },
    pubKeyCredParams,
    timeout:
      typeof publicKey.timeout === "number" ? publicKey.timeout : undefined,
    excludeCredentials: toCredentialDescriptors(publicKey.excludeCredentials),
    authenticatorSelection: {
      authenticatorAttachment:
        attachment === "platform" || attachment === "cross-platform"
          ? attachment
          : undefined,
      requireResidentKey:
        typeof selection.requireResidentKey === "boolean"
          ? selection.requireResidentKey
          : undefined,
      residentKey: toRequirement(selection.residentKey),
      userVerification: toRequirement(selection.userVerification) ?? "required",
    },
    attestation: isAttestation(attestation) ? attestation : undefined,
  };
}

// Runs the browser passkey prompt for a gateway assertion. Null when the
// browser returns something other than an assertion.
export async function getPasskeyAssertion(assertion: unknown) {
  const credential = await navigator.credentials.get({
    publicKey: toRequestOptions(assertion),
  });
  if (!(credential instanceof PublicKeyCredential)) return null;
  const response = credential.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) return null;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: "public-key" as const,
    response: {
      authenticatorData: toBase64Url(response.authenticatorData),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      signature: toBase64Url(response.signature),
      ...(response.userHandle && {
        userHandle: toBase64Url(response.userHandle),
      }),
    },
  };
}

// Runs the browser prompt that creates a passkey for a gateway registration.
// Null when the browser returns something other than an attestation.
export async function createPasskeyCredential(creation: unknown) {
  const credential = await navigator.credentials.create({
    publicKey: toCreationOptions(creation),
  });
  if (!(credential instanceof PublicKeyCredential)) return null;
  const response = credential.response;
  if (!(response instanceof AuthenticatorAttestationResponse)) return null;
  const attachment = credential.authenticatorAttachment;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: "public-key" as const,
    response: {
      attestationObject: toBase64Url(response.attestationObject),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      transports: response.getTransports(),
    },
    ...(attachment && { authenticatorAttachment: attachment }),
  };
}
