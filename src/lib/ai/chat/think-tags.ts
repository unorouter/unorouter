// Some providers leak chain-of-thought into the visible text channel as
// <think>...</think> instead of a separate reasoning part. These helpers strip
// it. Two behaviors exist and are kept distinct on purpose:
//   - REQUEST side (stripThinkBlocks/unwrapThinkTags): matched-close backref,
//     includes the <Thoughts> variant, eats a trailing newline run. Used before
//     sending assistant history upstream, where a mismatched tag must NOT eat
//     unrelated content.
//   - DISPLAY side (stripThinkForDisplay): case-insensitive, tolerates a
//     mismatched close (<think>..</thinking>), and truncates at an unclosed
//     opening tag so a mid-stream partial never dumps raw reasoning into a bubble.

const REQUEST_BLOCK_RE = /<(think|thinking|Thoughts)>[\s\S]*?<\/\1>\s*/g;
const REQUEST_TAG_RE = /<\/?(think|thinking|Thoughts)>/g;

const DISPLAY_BLOCK_RE = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
const DISPLAY_OPEN_RE = /<think(?:ing)?>/i;

// Request-side: remove whole matched <think>..</think> blocks (and Thoughts).
export function stripThinkBlocks(text: string): string {
  return text.replace(REQUEST_BLOCK_RE, "");
}

// Request-side salvage: drop only the tags, keeping the inner text, when a
// message would otherwise be left with no renderable content.
export function unwrapThinkTags(text: string): string {
  return text.replace(REQUEST_TAG_RE, "");
}

// Display-side: strip closed think blocks, then truncate at any unclosed opener.
export function stripThinkForDisplay(text: string): string {
  const stripped = text.replace(DISPLAY_BLOCK_RE, "");
  const openIdx = stripped.search(DISPLAY_OPEN_RE);
  return openIdx === -1 ? stripped : stripped.slice(0, openIdx);
}
