import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { downloadAndUpload, mediaKey, uploadToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import type { ImageGenerationBody, VideoGenerationBody } from "@/lib/validation/chat";
import { getProvider } from "@/server/constants";
import { generateImage } from "ai";

export async function uploadMedia(file: File, convId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${uid(8)}.${ext}`;
  const key = mediaKey(convId, uid(8), filename);
  const url = await uploadToR2(key, buffer, file.type);

  return { url, mimeType: file.type, sizeBytes: buffer.length };
}

export async function generateImageMedia(
  apiKey: string,
  body: ImageGenerationBody,
) {
  const provider = getProvider(apiKey);

  const { images } = await generateImage({
    model: provider.imageModel(body.model),
    prompt: body.prompt,
  });

  if (!images || images.length === 0) {
    throw new Error(msg("ERRORS.NO_IMAGE_GENERATED"));
  }

  const urls: string[] = [];
  const groupKey = uid(8);
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const filename = `${uid(8)}.png`;
    const key = mediaKey(body.convId, groupKey, filename);
    const buffer = Buffer.from(image.base64, "base64");
    const url = await uploadToR2(key, buffer, "image/png");
    urls.push(url);
  }

  return { urls };
}

export async function generateVideo(
  apiKey: string,
  body: VideoGenerationBody,
) {
  const submitBody: Record<string, unknown> = {
    model: body.model,
    prompt: body.prompt,
  };
  if (body.image) submitBody.image = body.image;

  const submitRes = await fetch(`${env.apiUrl}/v1/video/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(submitBody),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(err);
  }

  const submitData = await submitRes.json();
  const taskId = submitData.id || submitData.task_id;

  if (!taskId) {
    const videoUrl = submitData.data?.[0]?.url || submitData.url;
    if (videoUrl) {
      const r2Url = await downloadAndUpload(videoUrl, body.convId, uid(8));
      return { url: r2Url };
    }
    throw new Error(msg("ERRORS.NO_TASK_ID"));
  }

  // Poll for completion (max 5 minutes, 5s intervals)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(
      `${env.apiUrl}/v1/video/generations/${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const status = pollData.status;

    if (
      status === "completed" ||
      status === "succeeded" ||
      status === "ready"
    ) {
      const videoUrl =
        pollData.data?.[0]?.url ||
        pollData.output?.url ||
        pollData.result?.url ||
        pollData.url;

      if (!videoUrl) throw new Error(msg("ERRORS.NO_VIDEO_URL"));

      const r2Url = await downloadAndUpload(videoUrl, body.convId, uid(8));
      return { url: r2Url };
    }

    if (status === "failed" || status === "error") {
      throw new Error(
        pollData.error || msg("ERRORS.VIDEO_GENERATION_FAILED"),
      );
    }
  }

  throw new Error(msg("ERRORS.VIDEO_GENERATION_TIMED_OUT"));
}
