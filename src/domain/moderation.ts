export const ASCII_HINT =
  "Use English letters, numbers, spaces and simple punctuation (. , ! ? & ' ( ) + : ; / @ # % = -).";
export function asciiText(
  value: unknown,
  label: string,
  max: number,
  required = true,
) {
  if (typeof value !== "string") throw new Error(`Enter ${label}.`);
  if (/[^\x20-\x7E\r\n\t]/.test(value))
    throw new Error(`${label}: ${ASCII_HINT}`);
  const text = value.trim().replace(/\s+/g, " ");
  if (
    (required && !text) ||
    text.length > max ||
    !/^[A-Za-z0-9 .,!?&'()+:;/@#%=\-]*$/.test(text)
  )
    throw new Error(`${label}: ${ASCII_HINT} Maximum ${max} characters.`);
  return text;
}
export function prohibitedReason(value: string) {
  const normalized = value.toLowerCase().replace(
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
  );
  const compact = normalized.replace(/[^a-z]/g, "");
  const alcoholBrands = [
    "kingfisher",
    "budweiser",
    "tuborg",
    "heineken",
    "carlsberg",
    "bacardi",
    "smirnoff",
    "jackdaniels",
    "johnniewalker",
    "oldmonk",
    "royalstag",
    "blenderspride",
    "mcdowell",
    "officerschoice",
    "magicmoments",
    "coronaextra",
    "coronabeer",
    "absolutvodka",
    "signaturewhisky",
    "blackdogwhisky",
    "desisharab",
    "desidaru",
  ];
  const drinkText = normalized.replace(/butter[\W_]*scotch/g, "");
  if (
    alcoholBrands.some((term) => compact.includes(term)) ||
    /\b(alcohol(?:ic)?|beers?|vodkas?|whisk(?:e)?y|rum|gin|tequila|brandy|wines?|liquor|liqueur|champagne|nasha|nashe|nashila|bhang|bhaang|hash|charas|gummies thc)\b/.test(
      drinkText,
    ) ||
    /\bb[\W_]*e[\W_]*e[\W_]*r\b/.test(normalized)
  )
    return "Alcohol, intoxicants and nasha items are not allowed in either marketplace.";
  const animalText = normalized
    .replace(/\bred[\W_]*bull\b/g, "")
    .replace(/\bcat\s*(?:5e?|6a?|7|8)\b/g, "");
  const animalWords =
    /\b(animals?|rats?|mice|dogs?|pupp(?:y|ies)|kittens?|rabbits?|hamsters?|guinea pigs?|snakes?|cows?|buffalo(?:es)?|goats?|sheep|horses?|monkeys?|parrots?|pigeons?|turtles?|tortoises?|pets?|livestock)\b/;
  if (
    animalWords.test(animalText) ||
    /\br[\W_]*a[\W_]*t(?:[\W_]*s)?\b/.test(animalText) ||
    (/\bmouse\b/.test(animalText) &&
      !/\b(computer|gaming|wireless|wired|usb|bluetooth|logitech|keyboard|optical)\b/.test(
        animalText,
      )) ||
    (/\bcat\b/.test(animalText) &&
      !/\b(exam|book|guide|preparation|prep|entrance|cable|network|ethernet)\b/.test(
        animalText,
      )) ||
    (/\b(live|alive|breeding|adoption|adopt)\b/.test(animalText) &&
      /\b(fish|chickens?|birds?|bulls?|ducks?)\b/.test(animalText))
  )
    return "Live animals, pets and livestock are not permitted.";
  // Indian retail aliases need explicit coverage: a pack may never say "cigarette".
  const tobaccoAliases = [
    "chhotigold",
    "chotigold",
    "chhotagold",
    "chotagold",
    "chhotigoldflake",
    "chotigoldflake",
    "goldflake",
    "goldflak",
    "goldflac",
    "marlboro",
    "malboro",
    "malb0ro",
    "classicmild",
    "classicultramild",
    "classicregular",
    "classiciceburst",
    "classicswitch",
    "willsnavycut",
    "navycut",
    "silkcut",
    "indiakings",
    "insigniacig",
    "parliamentcig",
    "davidoff",
    "dunhill",
    "bensonhedges",
    "bensonandhedges",
    "essecig",
    "esseshift",
    "esseshaft",
    "mondcig",
    "mondswitch",
    "totalcig",
    "totalmint",
    "advancecig",
    "suttabox",
    "suttapack",
    "panmasala",
    "paanmasala",
    "rajnigandha",
    "vimalpan",
    "vimalpaan",
    "panparag",
    "chainikhaini",
    "zarda",
    "jarda",
    "kuberaini",
  ];
  if (
    tobaccoAliases.some((term) => compact.includes(term)) ||
    /\b(cigs?|cigg?s?|cigg?s?|smokes?|baccy|juul|iqos|heets)\b/.test(
      normalized,
    ) ||
    /\bc[\W_]*i[\W_]*g(?:[\W_]*s)?\b/.test(normalized)
  )
    return "This item is not permitted. Please follow the marketplace rules.";
  const strong = [
    "cigarette",
    "cigaret",
    "sutta",
    "sutte",
    "tobacco",
    "tambaku",
    "tambakhu",
    "gutkha",
    "gutka",
    "khaini",
    "bidi",
    "beedi",
    "vaping",
    "vape",
    "hookah",
    "hukka",
    "shisha",
    "cannabis",
    "marijuana",
    "ganja",
    "charas",
    "hashish",
    "heroin",
    "cocaine",
    "methamphetamine",
    "ecstasy",
    "fentanyl",
    "opium",
    "afeem",
    "afim",
    "nicotine",
    "smoking",
    "vodka",
    "whisky",
    "whiskey",
    "daaru",
    "daru",
    "sharab",
    "weed",
    "mdma",
  ];
  if (
    strong.some((word) => compact.includes(word)) ||
    /\b(cigar|bidi|weed|drugs?|mdma|lsd|alcohol|beer|rum|pills|steroids|weapons?|ammunition)\b/.test(
      normalized,
    )
  )
    return "Tobacco, vaping, intoxicants, controlled substances and weapons are not allowed in either marketplace.";
  if (/(?:https?:|www\.|t\.me|wa\.me)/i.test(value))
    return "External links are not allowed in listing text. Use the built-in seller contact options.";
  if (
    /\b(rx|prescription|antibiotics?|alprazolam|tramadol|codeine|clonazepam|diazepam|oxycodone|loose tablets?)\b/.test(
      normalized.replace(/non[ -]?prescription/g, ""),
    )
  )
    return "Prescription medicines, controlled medicines and loose tablets are not allowed.";
  return null;
}
export function checkContent(...values: string[]) {
  const reason = prohibitedReason(values.join(" "));
  if (reason) throw new Error(reason);
}
export function asciiDisplay(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}
