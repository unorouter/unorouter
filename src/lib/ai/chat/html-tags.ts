// Formatting only, and deliberately attribute free. Model output, imported
// character cards and other people's messages in a room all reach the renderer,
// so this list is the whole defence: nothing here can load, link out or run.
const ALLOWED_HTML_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "del",
  "br",
  "hr",
  "small",
  "sub",
  "sup",
  "mark",
  "details",
  "summary",
  "blockquote",
  "p",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?\/?>/g;

// Roleplay prose is full of `<gasps>`, which a real HTML parse would swallow.
// Attributes go too: an allowed tag carrying `onclick` reaches React as a string
// listener and throws, which blanks the whole message.
export function escapeUnknownTags(chunk: string): string {
  return chunk.replace(TAG_RE, (match, name: string, attrs?: string) => {
    if (!ALLOWED_HTML_TAGS.has(name.toLowerCase()))
      return `&lt;${match.slice(1)}`;
    if (!attrs) return match;
    const closing = match.endsWith("/>") ? " /" : "";
    return match.startsWith("</") ? `</${name}>` : `<${name}${closing}>`;
  });
}

const COMMENT_BLOCK_RE = /<!--[\s\S]*?-->/g;
const COMMENT_OPEN_RE = /<!--/;
// A comment arrives one character at a time while streaming, so the marker
// itself is half written for a frame or two and would flash on screen.
const COMMENT_PARTIAL_RE = /<(?:!(?:-(?:-)?)?)?$/;

export type HiddenBlocks = { text: string; blocks: string[] };

// Same shape as stripThinkForDisplay: closed blocks come out, an unclosed one
// truncates the rest, and the content resurfaces in its own panel.
export function splitHiddenBlocks(chunk: string): HiddenBlocks {
  const blocks: string[] = [];
  let text = chunk.replace(COMMENT_BLOCK_RE, (match) => {
    const inner = match.slice(4, -3).trim();
    if (inner) blocks.push(inner);
    return "";
  });
  const open = text.search(COMMENT_OPEN_RE);
  if (open !== -1) {
    const inner = text.slice(open + 4).trim();
    if (inner) blocks.push(inner);
    text = text.slice(0, open);
  }
  return { text: text.replace(COMMENT_PARTIAL_RE, ""), blocks };
}

// Not extended from the library default, which allows far more. The one
// attribute is the fence language: no utility class starts with `language-`, so
// it cannot become a layout that covers the page.
export const HTML_SANITIZE_SCHEMA = {
  tagNames: [...ALLOWED_HTML_TAGS],
  attributes: { code: [["className", /^language-[\w+#.-]+$/]] },
  protocols: {},
  strip: ["script", "style"],
  clobber: [],
  clobberPrefix: "",
  ancestors: {},
  required: {},
};

const ALLOWED_OPEN_RE = new RegExp(
  `<\\/?(?:${[...ALLOWED_HTML_TAGS].join("|")})(?:[\\s/>])`,
  "i",
);

// rehype-raw reserializes and reparses the whole tree, and inlay images inline
// hundreds of KB of base64 into it, so the raw pass is only worth paying for on
// a message that actually carries a tag we would render.
export function hasAllowedHtml(text: string): boolean {
  return ALLOWED_OPEN_RE.test(text);
}
