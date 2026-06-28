export function makeNonce(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function nonceTag(nonce: string): string {
  return `Begin your reply with the tag [${nonce}] then a space, then your answer.`;
}

export function echoesNonce(text: string, nonce: string): boolean {
  return text.includes(nonce.toLowerCase());
}
