import { rec, recArr } from "@/lib/utils/base";

// OpenRouter style image output (`delta.images` / `message.images`) is dropped
// by the SDK's chunk schema, so it is folded into the text as markdown before
// parsing; the persist step then moves the bytes into local media.
function imagesMarkdown(images: unknown): string {
  return recArr(images)
    .map((img) => {
      const url = rec(img.image_url)?.url ?? img.url;
      return typeof url === "string" && url ? `![image](${url})` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function foldImages(target: Record<string, unknown> | undefined): boolean {
  if (!target || !Array.isArray(target.images) || target.images.length === 0)
    return false;
  const md = imagesMarkdown(target.images);
  delete target.images;
  if (!md) return false;
  const text = typeof target.content === "string" ? target.content : "";
  target.content = `${text}\n\n${md}\n\n`;
  return true;
}

function rewriteChunk(json: string): string {
  if (!json.includes('"images"')) return json;
  try {
    const body = rec(JSON.parse(json));
    let changed = false;
    for (const choice of recArr(body?.choices)) {
      changed = foldImages(rec(choice.delta)) || changed;
      changed = foldImages(rec(choice.message)) || changed;
    }
    return changed ? JSON.stringify(body) : json;
  } catch {
    return json;
  }
}

function rewriteSse(
  body: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  let pending = "";
  const encoder = new TextEncoder();
  const line = (l: string) =>
    l.startsWith("data:") && !l.includes("[DONE]")
      ? `data: ${rewriteChunk(l.slice(5).trimStart())}`
      : l;
  const decoder = new TextDecoder();
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        pending += decoder.decode(chunk, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        if (lines.length)
          controller.enqueue(encoder.encode(lines.map(line).join("\n") + "\n"));
      },
      flush(controller) {
        pending += decoder.decode();
        if (pending) controller.enqueue(encoder.encode(line(pending)));
      },
    }),
  );
}

export function inlineImagesFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const res = await inner(input, init);
    if (!res.ok || !res.body) return res;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/event-stream"))
      return new Response(rewriteSse(res.body), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    if (!type.includes("json")) return res;
    const text = await res.text();
    return new Response(rewriteChunk(text), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  };
}
