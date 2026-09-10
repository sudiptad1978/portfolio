/** Reading time in whole minutes, ~200 wpm heuristic. Always at least 1. */
export function readingTimeMinutes(text: string, wordsPerMinute = 200): number {
  const words = text
    .replace(/<[^>]+>/g, ' ') // ignore markup
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
