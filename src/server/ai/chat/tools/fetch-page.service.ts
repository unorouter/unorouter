import { msg } from "@/lib/config/constants";
import { safeFetchFollow } from "@/lib/config/safe-fetch";
import { extractPdfText } from "@/lib/ai/chat/pipeline/pdf-extract";
import type { FetchPageBody } from "@/lib/validation/chat";

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const PAGE_CHARS = 40_000;
const TEXT_TYPES =
  /^(text\/html|application\/xhtml\+xml|text\/plain|text\/markdown)/;
const USER_AGENT = "UnoRouterBot/1.0 (+https://unorouter.com)";

async function htmlToMarkdown(html: string, url: string) {
  const [{ parseHTML }, { Readability }, { default: TurndownService }] =
    await Promise.all([
      import("linkedom"),
      import("@mozilla/readability"),
      import("turndown"),
    ]);
  // Readability rewrites the document it reads, so the fallback parses afresh.
  const article = new Readability(parseHTML(html).document).parse();
  const { document } = parseHTML(html);
  const title = document.title?.trim() || null;
  let body = article?.content ?? null;
  if (!body) {
    for (const el of document.querySelectorAll(
      "script, style, noscript, nav, footer, aside, svg",
    ))
      el.remove();
    body = document.body?.innerHTML ?? html;
  }
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  turndown.remove(["script", "style", "noscript"]);
  return {
    title: article?.title?.trim() || title,
    markdown: turndown.turndown(body).trim(),
    base: url,
  };
}

export async function fetchPage(body: FetchPageBody) {
  const res = await safeFetchFollow(body.url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,text/plain,application/pdf",
    },
    maxBytes: MAX_PDF_BYTES,
  });
  if (res.status >= 400) throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  const type = (res.contentType ?? "").toLowerCase();
  const isPdf =
    type.startsWith("application/pdf") ||
    res.buffer.subarray(0, 5).toString("latin1") === "%PDF-";

  let title: string | null = null;
  let text: string;
  if (isPdf) {
    text = (await extractPdfText(new Uint8Array(res.buffer))) ?? "";
  } else if (TEXT_TYPES.test(type) || !type) {
    if (res.buffer.byteLength > MAX_HTML_BYTES)
      throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
    const raw = res.buffer.toString("utf8");
    if (type.startsWith("text/plain") || type.startsWith("text/markdown")) {
      text = raw;
    } else {
      const page = await htmlToMarkdown(raw, res.finalUrl);
      title = page.title;
      text = page.markdown;
    }
  } else {
    throw new Error(msg("ERRORS.UNSUPPORTED_CONTENT"));
  }

  const start = Math.min(body.start ?? 0, text.length);
  const slice = text.slice(start, start + PAGE_CHARS);
  return {
    url: res.finalUrl,
    title,
    totalChars: text.length,
    start,
    truncated: start + slice.length < text.length,
    content: slice,
  };
}
