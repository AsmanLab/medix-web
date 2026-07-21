const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Generate URL slug from a Russian/Latin title. */
export function slugifyCategoryName(name: string): string {
  const lower = name.trim().toLocaleLowerCase("ru");
  let out = "";
  for (const ch of lower) {
    if (CYRILLIC_MAP[ch] !== undefined) {
      out += CYRILLIC_MAP[ch];
      continue;
    }
    if (/[a-z0-9]/.test(ch)) {
      out += ch;
      continue;
    }
    if (/\s|-|_/.test(ch)) {
      out += "-";
    }
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}
