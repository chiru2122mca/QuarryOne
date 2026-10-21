/** Deterministic ASCII prefix; names themselves are never transliterated or changed. */
export function quarryCodePrefix(name: string): string {
  const words =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .match(/[A-Z0-9]+/g) ?? [];
  if (!words.length) return "QRY";
  if (words.length === 1) return words[0].slice(0, 3);
  if (words.length === 2) return words[0].slice(0, 2) + words[1][0];
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("");
}

/** First free positive suffix, at least two digits; caller excludes the current site's code. */
export function suggestQuarryCode(
  name: string,
  codes: readonly string[],
): string {
  const prefix = quarryCodePrefix(name);
  const used = new Set(codes.map((code) => code.trim().toUpperCase()));
  for (let sequence = 1; sequence <= used.size + 1; sequence++) {
    const code = prefix + String(sequence).padStart(2, "0");
    if (!used.has(code)) return code;
  }
  throw new Error("Unable to allocate a unique quarry draft code.");
}
