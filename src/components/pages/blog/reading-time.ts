const DEFAULT_WPM = 200;

export function estimateReadingMinutes(
  wordCount: number,
  wpm: number = DEFAULT_WPM,
): number {
  if (wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / wpm));
}
