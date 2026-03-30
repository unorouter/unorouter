import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config/constants";
import { uploadToR2, mediaKey } from "@/lib/storage/r2";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const convId = formData.get("convId") as string;
  const msgId = formData.get("msgId") as string;

  if (!file || !convId || !msgId) {
    return Response.json(
      { success: false, message: "Missing file, convId, or msgId" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${nanoid(8)}.${ext}`;
  const key = mediaKey(convId, msgId, filename);

  const url = await uploadToR2(key, buffer, file.type);

  return Response.json({
    success: true,
    data: { url, mimeType: file.type, sizeBytes: buffer.length },
  });
}
