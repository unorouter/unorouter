// Error reports leave the device, so anything that could identify a person or
// unlock an account is masked before they do.
const PATTERNS: [RegExp, string][] = [
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>"],
  [/\bBearer\s+[\w.~+/-]+=*/gi, "Bearer <key>"],
  [/\bsk-[\w-]{8,}/g, "sk-<key>"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>"],
];
const TEXT_ONLY: [RegExp, string][] = [
  [/(https?:\/\/[^\s?#)]+)[?#][^\s)]*/g, "$1"],
  [/\d{6,}/g, "<n>"],
];

export function scrubText(text: string): string {
  return [...PATTERNS, ...TEXT_ONLY].reduce(
    (s, [re, to]) => s.replace(re, to),
    text,
  );
}
