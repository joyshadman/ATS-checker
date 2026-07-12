export function compressText(text: string, maxChars = 10_000): string {
  let result = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const seen = new Set<string>();
  result = result.filter((l) => {
    const lower = l.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  let output = result.join("\n").trim();
  if (output.length > maxChars) {
    output = output.slice(0, maxChars) + "\n\n[truncated]";
  }
  return output;
}
