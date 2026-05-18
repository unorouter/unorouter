import { readFile } from "node:fs/promises";
import { join } from "node:path";

let cached: string | null = null;

export async function GET() {
  if (!cached) {
    const path = join(
      process.cwd(),
      "node_modules/@libsqlstudio/gui/dist/index.css",
    );
    cached = await readFile(path, "utf8");
  }
  return new Response(cached, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
