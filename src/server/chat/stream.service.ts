import { deriveUpstream, getProvider } from "@/server/constants";
import { convertToModelMessages, streamText } from "ai";
import { pendingUsageByConv } from "./message.service";

export async function streamChat(
  apiKey: string,
  body: {
    model: string;
    messages: Parameters<typeof convertToModelMessages>[0];
    convId?: string | null;
    webSearch?: boolean;
  },
  request: Request,
) {
  const provider = getProvider(apiKey);
  const { upstream } = deriveUpstream({ request });

  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(body.messages),
    providerOptions: body.webSearch
      ? { unorouter: { web_search_options: {} } }
      : undefined,
    onFinish: ({ usage, response }) => {
      if (!body.convId) return;

      // Buffer reqId + tokens immediately; persist endpoint handles cost lookup + DB writes
      pendingUsageByConv.set(body.convId, {
        requestId: response.headers?.["x-oneapi-request-id"] ?? undefined,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cost: 0,
        upstreamHeaders: upstream.headers,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
