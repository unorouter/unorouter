// Some providers leak chain-of-thought into the visible text channel as
// <think>...</think> instead of a separate reasoning part. The request and
// display behaviors differ ON PURPOSE:
//   - REQUEST: matched-close backref, so a mismatched tag cannot eat unrelated
//     history on its way upstream.
//   - DISPLAY: case-insensitive, tolerates a mismatched close
//     (<think>..</thinking>), and truncates at an unclosed opener so a
//     mid-stream partial never dumps raw reasoning into a bubble.

const REQUEST_BLOCK_RE = /<(think|thinking|Thoughts)>[\s\S]*?<\/\1>\s*/g;
const REQUEST_TAG_RE = /<\/?(think|thinking|Thoughts)>/g;

const DISPLAY_BLOCK_RE = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
const DISPLAY_OPEN_RE = /<think(?:ing)?>/i;

export function stripThinkBlocks(text: string): string {
  return text.replace(REQUEST_BLOCK_RE, "");
}

// Salvage path: keeps the inner text, for a message that would otherwise be left
// with no renderable content at all.
export function unwrapThinkTags(text: string): string {
  return text.replace(REQUEST_TAG_RE, "");
}

export function stripThinkForDisplay(text: string): string {
  const stripped = text.replace(DISPLAY_BLOCK_RE, "");
  const openIdx = stripped.search(DISPLAY_OPEN_RE);
  return openIdx === -1 ? stripped : stripped.slice(0, openIdx);
}
