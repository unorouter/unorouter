import { parseJwks, stripPrivateFields } from "@/server/auth/web-bot-auth/keys";

// http-message-sig 0.3 dropped the MediaType enum. web-bot-auth exports a
// same-named constant but it holds the well-known PATH, not the media type, so
// it is not a substitute here.
const SIGNATURES_DIRECTORY_MEDIA_TYPE =
  "application/http-message-signatures-directory+json";

export function GET() {
  const keys = parseJwks(process.env.WEB_BOT_AUTH_PUBLIC_JWKS).map(
    stripPrivateFields,
  );
  return Response.json(
    { keys },
    {
      headers: {
        "Content-Type": SIGNATURES_DIRECTORY_MEDIA_TYPE,
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
