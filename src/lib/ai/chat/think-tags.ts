const REQUEST_BLOCK_RE = /<(think|thinking|Thoughts)>[\s\S]*?<\/\1>\s*/g;
const REQUEST_TAG_RE = /<\/?(think|thinking|Thoughts)>/g;

const DISPLAY_BLOCK_RE = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
const DISPLAY_OPEN_RE = /<think(?:ing)?>/i;

export function stripThinkBlocks(text: string): string {
  return text.replace(REQUEST_BLOCK_RE, "");
}

export function unwrapThinkTags(text: string): string {
  return text.replace(REQUEST_TAG_RE, "");
}

export function stripThinkForDisplay(text: string): string {
  const stripped = text.replace(DISPLAY_BLOCK_RE, "");
  const openIdx = stripped.search(DISPLAY_OPEN_RE);
  return openIdx === -1 ? stripped : stripped.slice(0, openIdx);
}
