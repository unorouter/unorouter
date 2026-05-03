import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import {
  OAUTH_SCOPES,
  OAUTH_SCOPE_TRANSLATION_KEYS,
} from "@/lib/config/oauth-scopes";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const siteOrigin = new URL(env.appUrl).origin;
const apiOrigin = new URL(env.apiUrl).origin;

// A2A AgentCard per https://github.com/a2aproject/A2A specification on main.
// Required fields: protocolVersion, name, description, url, version,
// capabilities, defaultInputModes, defaultOutputModes, skills,
// supportedInterfaces. Auth uses OpenAPI-style `securitySchemes` + `security`.
// supportedInterfaces.protocolBinding accepts "JSONRPC", "GRPC", "HTTP+JSON",
// or a URI; the scanner treats supportedInterfaces as required (the field name
// has been stable across v0.3.x and v1.x; only the entry shape evolved).
export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });

  const scopeDescriptions = Object.fromEntries(
    OAUTH_SCOPES.map((scope) => [
      scope,
      t(OAUTH_SCOPE_TRANSLATION_KEYS[scope]),
    ]),
  );

  const body = {
    protocolVersion: "0.3.0",
    name: env.appName,
    description: t("WELL_KNOWN.AGENT_CARD.DESCRIPTION"),
    url: `${apiOrigin}/v1`,
    version: "1.0.0",
    provider: {
      organization: env.appName,
      url: siteOrigin,
    },
    documentationUrl: `${siteOrigin}/${locale}/docs`,
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json", "text/event-stream"],
    preferredTransport: "HTTP+JSON",
    supportedInterfaces: [
      {
        url: `${apiOrigin}/v1`,
        protocolBinding: "HTTP+JSON",
        protocolVersion: "0.3.0",
      },
    ],
    securitySchemes: {
      bearer: {
        type: "http",
        scheme: "bearer",
        description: t("WELL_KNOWN.AGENT_CARD.AUTH_DESCRIPTION", APP_VALUES),
      },
      oauth2: {
        type: "oauth2",
        flows: {
          authorizationCode: {
            authorizationUrl: `${apiOrigin}/oauth/v1/authorize`,
            tokenUrl: `${apiOrigin}/oauth/v1/token`,
            refreshUrl: `${apiOrigin}/oauth/v1/token`,
            scopes: scopeDescriptions,
          },
        },
      },
    },
    security: [{ bearer: [] }, { oauth2: [...OAUTH_SCOPES] }],
    skills: [
      {
        id: "chat_completion",
        name: t("WELL_KNOWN.AGENT_CARD.SKILLS.CHAT_COMPLETION_NAME"),
        description: t(
          "WELL_KNOWN.AGENT_CARD.SKILLS.CHAT_COMPLETION_DESCRIPTION",
        ),
        tags: ["chat", "llm", "completion", "streaming"],
        inputModes: ["application/json"],
        outputModes: ["application/json", "text/event-stream"],
      },
      {
        id: "image_generation",
        name: t("WELL_KNOWN.AGENT_CARD.SKILLS.IMAGE_GENERATION_NAME"),
        description: t(
          "WELL_KNOWN.AGENT_CARD.SKILLS.IMAGE_GENERATION_DESCRIPTION",
        ),
        tags: ["image", "generation"],
        inputModes: ["application/json"],
        outputModes: ["application/json", "image/png", "image/jpeg"],
      },
      {
        id: "video_generation",
        name: t("WELL_KNOWN.AGENT_CARD.SKILLS.VIDEO_GENERATION_NAME"),
        description: t(
          "WELL_KNOWN.AGENT_CARD.SKILLS.VIDEO_GENERATION_DESCRIPTION",
        ),
        tags: ["video", "generation"],
        inputModes: ["application/json"],
        outputModes: ["application/json", "video/mp4"],
      },
      {
        id: "audio",
        name: t("WELL_KNOWN.AGENT_CARD.SKILLS.AUDIO_NAME"),
        description: t("WELL_KNOWN.AGENT_CARD.SKILLS.AUDIO_DESCRIPTION"),
        tags: ["audio", "speech", "tts", "transcription"],
        inputModes: [
          "application/json",
          "audio/mpeg",
          "audio/wav",
          "audio/webm",
        ],
        outputModes: [
          "application/json",
          "audio/mpeg",
          "audio/wav",
          "text/plain",
        ],
      },
      {
        id: "embeddings",
        name: t("WELL_KNOWN.AGENT_CARD.SKILLS.EMBEDDINGS_NAME"),
        description: t("WELL_KNOWN.AGENT_CARD.SKILLS.EMBEDDINGS_DESCRIPTION"),
        tags: ["embeddings", "vector"],
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
      {
        id: "model_catalog",
        name: t("WELL_KNOWN.AGENT_CARD.SKILLS.MODEL_CATALOG_NAME"),
        description: t(
          "WELL_KNOWN.AGENT_CARD.SKILLS.MODEL_CATALOG_DESCRIPTION",
        ),
        tags: ["models", "pricing", "discovery"],
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
    ],
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      Vary: "Cookie",
    },
  });
}
