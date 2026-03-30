import { ACCESS_TOKEN_COOKIE } from "@/lib/config/constants";
import { mediaKey, uploadToR2 } from "@/lib/storage/r2";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

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

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      {
        success: false,
        message: "File type not allowed. Accepted: PNG, JPEG, WebP, GIF, PDF.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { success: false, message: "File too large. Maximum size is 20MB." },
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
