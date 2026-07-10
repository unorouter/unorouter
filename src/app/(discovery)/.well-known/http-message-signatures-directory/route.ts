import { parseJwks, stripPrivateFields } from "@/server/auth/web-bot-auth/keys";
import { MediaType } from "http-message-sig";


export function GET() {
  const keys = parseJwks(process.env.WEB_BOT_AUTH_PUBLIC_JWKS).map(
    stripPrivateFields,
  );
  return Response.json(
    { keys },
    {
      headers: {
        "Content-Type": MediaType.HTTP_MESSAGE_SIGNATURES_DIRECTORY,
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
