import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config/constants";
import { uploadToR2, mediaKey } from "@/lib/storage/r2";
import { nanoid } from "nanoid";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/**
 * Video generation route. No AI SDK support for custom video endpoints,
 * so we call new-api's /v1/video/generations directly.
 *
 * Flow: submit task -> poll for completion -> download from provider CDN -> upload to R2.
 */
export async function POST(request: Request) {
  const { prompt, model, convId, msgId, image } = await request.json();

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  // Submit video generation task
  const body: Record<string, unknown> = {
    model,
    prompt,
  };
  if (image) body.image = image;

  const submitRes = await fetch(`${API_URL}/v1/video/generations`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    return Response.json(
      { success: false, message: err },
      { status: submitRes.status },
    );
  }

  const submitData = await submitRes.json();
  const taskId = submitData.id || submitData.task_id;

  if (!taskId) {
    // Some providers return the video URL directly
    const videoUrl = submitData.data?.[0]?.url || submitData.url;
    if (videoUrl) {
      const r2Url = await downloadAndUpload(videoUrl, convId, msgId);
      return Response.json({ success: true, data: { url: r2Url } });
    }
    return Response.json({
      success: false,
      message: "No task ID or URL in response",
    });
  }

  // Poll for completion (max 5 minutes, 5s intervals)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(
      `${API_URL}/v1/video/generations/${taskId}`,
      { headers },
    );

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const status = pollData.status;

    if (status === "completed" || status === "succeeded" || status === "ready") {
      const videoUrl =
        pollData.data?.[0]?.url ||
        pollData.output?.url ||
        pollData.result?.url ||
        pollData.url;

      if (!videoUrl) {
        return Response.json({
          success: false,
          message: "Completed but no video URL found",
        });
      }

      const r2Url = await downloadAndUpload(videoUrl, convId, msgId);
      return Response.json({ success: true, data: { url: r2Url } });
    }

    if (status === "failed" || status === "error") {
      return Response.json({
        success: false,
        message: pollData.error || "Video generation failed",
      });
    }
  }

  return Response.json({
    success: false,
    message: "Video generation timed out",
  });
}

async function downloadAndUpload(
  videoUrl: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const res = await fetch(videoUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "video/mp4";
  const ext = contentType.split("/")[1] ?? "mp4";
  const filename = `${nanoid(8)}.${ext}`;
  const key = mediaKey(convId, msgId, filename);
  return uploadToR2(key, buffer, contentType);
}
