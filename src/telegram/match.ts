export function normalizeUz(text: string): string {
  return text
    .replace(/[''`‘’ʻʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function hasAction(text: string | undefined, ...needles: string[]): boolean {
  if (!text) {
    return false;
  }
  const n = normalizeUz(text);
  return needles.some((item) => n.includes(normalizeUz(item)));
}
