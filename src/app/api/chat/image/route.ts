import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateImage } from "ai";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config/constants";
import { uploadToR2, mediaKey } from "@/lib/storage/r2";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const { prompt, model, convId, msgId } = await request.json();

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

  const { images } = await generateImage({
    model: provider.imageModel(model),
    prompt,
  });

  if (!images || images.length === 0) {
    return Response.json({ success: false, message: "No image generated" });
  }

  // Upload generated images to R2
  const urls: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const filename = `${nanoid(8)}.png`;
    const key = mediaKey(convId, msgId, filename);

    const buffer = Buffer.from(image.base64, "base64");
    const url = await uploadToR2(key, buffer, "image/png");
    urls.push(url);
  }

  return Response.json({ success: true, data: { urls } });
}
