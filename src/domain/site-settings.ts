export type SearchAlias = { keyword: string; product: string };
export type SiteSettings = {
  pawnEnabled: boolean;
  signupEnabled: boolean;
  uploadsEnabled: boolean;
  demoEnabled: boolean;
  maintenanceUntil: number;
  maintenanceMessage: string;
  announcement: string;
  blockedWords: string[];
  searchAliases: SearchAlias[];
};
export const DEFAULT_SETTINGS: SiteSettings = {
  pawnEnabled: true,
  signupEnabled: true,
  uploadsEnabled: true,
  demoEnabled: false,
  maintenanceUntil: 0,
  maintenanceMessage:
    "We’re making a few improvements. Please come back shortly.",
  announcement: "",
  blockedWords: [],
  searchAliases: [],
};
export type PublicSettings = Omit<SiteSettings, "blockedWords">;
export const MAX_MAINTENANCE_MS = 2 * 60 * 60 * 1000;
const searchText = (value: string) =>
  value.toLowerCase().replace(/[‘’]/g, "'").replace(/[–—]/g, "-");
export function publicSettings(settings: SiteSettings): PublicSettings {
  const { blockedWords: _private, ...visible } = settings;
  return visible;
}
export function parseWordlist(text: string) {
  if (text.length > 8000)
    throw Error("Keep the wordlist below 8,000 characters.");
  const words = [
    ...new Set(
      text
        .split(/[\r\n,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (
    words.length > 300 ||
    words.some(
      (s) =>
        s.length < 2 ||
        s.length > 60 ||
        !/[a-z0-9]/.test(s) ||
        normalized(s).length < 2 ||
        !/^[a-z0-9 '-]+$/.test(s),
    )
  )
    throw Error(
      "Use up to 300 words or phrases, 2–60 characters each. Use English letters, numbers, spaces, apostrophes or hyphens.",
    );
  return words;
}
export function parseAliases(text: string): SearchAlias[] {
  if (text.length > 8000)
    throw Error("Keep search aliases below 8,000 characters.");
  const aliases = new Map<string, SearchAlias>();
  for (const row of text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const parts = row.split(/[=,]/).map((s) => s.trim());
    if (
      parts.length !== 2 ||
      parts.some(
        (s) =>
          s.length < 2 || s.length > 70 || /[^\x20-\x7E]/.test(searchText(s)),
      )
    )
      throw Error(
        "Use one keyword = product name per line, for example: noodles = Maggi Masala Noodles.",
      );
    const [keyword, product] = parts;
    aliases.set(keyword.toLowerCase() + "=" + product.toLowerCase(), {
      keyword,
      product,
    });
  }
  if (aliases.size > 200) throw Error("Use up to 200 search aliases.");
  return [...aliases.values()];
}
const normalized = (value: string) =>
  value
    .toLowerCase()
    .replace(
      /[013457@$]/g,
      (c) =>
        ({
          "0": "o",
          "1": "i",
          "3": "e",
          "4": "a",
          "5": "s",
          "7": "t",
          "@": "a",
          $: "s",
        })[c]!,
    )
    .replace(/[^a-z0-9]/g, "");
export function customBlockedReason(value: string, words: string[]) {
  const compact = normalized(value);
  return words.some((word) => compact.includes(normalized(word)))
    ? "This text includes a word or phrase that is not allowed. Please change it."
    : null;
}
export function matchesSearch(
  text: string,
  query: string,
  aliases: SearchAlias[],
) {
  const search = searchText(query).trim(),
    haystack = searchText(text);
  return (
    haystack.includes(search) ||
    aliases.some(
      (a) =>
        searchText(a.keyword).includes(search) &&
        haystack.includes(searchText(a.product)),
    )
  );
}
