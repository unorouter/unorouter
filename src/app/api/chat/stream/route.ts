import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config/constants";

export async function POST(request: Request) {
  const { messages, model } = await request.json();

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const provider = createOpenAICompatible({
    name: "unorouter",
    baseURL: `${process.env.NEXT_PUBLIC_API_URL}/v1`,
    apiKey: accessToken,
  });

  const result = streamText({
    model: provider.chatModel(model),
    messages,
  });

  return result.toUIMessageStreamResponse();
}
