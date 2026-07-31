/**
 * Разбор описания товара на структурные блоки.
 *
 * В каталоге описания приходят одним текстовым полем, но внутри у них
 * устойчивая структура: абзацы через пустую строку, характеристики вида
 * «Производительность: 120 анализов в час», маркированные списки через «•»
 * и строки-подзаголовки («Технические характеристики»). Витрина выводила всё
 * это одним абзацем, и спецификация на 3000 символов читалась как сплошная
 * стена текста.
 *
 * Разбор намеренно консервативный: то, что не опознано уверенно, остаётся
 * обычным абзацем — исказить смысл хуже, чем не разметить.
 */

export type DescriptionBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "specs"; rows: { label: string; value: string }[] };

const BULLET = /^\s*[•·*—-]\s+/;

/** «Ключ: значение», где ключ — короткая фраза без предложений внутри. */
const SPEC = /^([^:]{2,40}):\s*(.+)$/;

/**
 * Строка похожа на заголовок: коротка, без завершающей точки и без двоеточия.
 * Такие строки в описаниях предваряют блок характеристик («Образцы»).
 */
function isHeading(line: string): boolean {
  return (
    line.length <= 60 &&
    !line.includes(":") &&
    !/[.;!?]$/.test(line) &&
    // Одно-два слова с заглавной — почти наверняка заголовок раздела.
    line.split(/\s+/).length <= 4 &&
    /^[А-ЯЁA-Z]/.test(line)
  );
}

export function parseDescription(raw: string | null | undefined): DescriptionBlock[] {
  if (!raw?.trim()) return [];

  const blocks: DescriptionBlock[] = [];

  for (const chunk of raw.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    let buffer: string[] = [];
    let listItems: string[] = [];
    let specRows: { label: string; value: string }[] = [];

    const flushParagraph = () => {
      if (buffer.length) {
        blocks.push({ kind: "paragraph", text: buffer.join(" ") });
        buffer = [];
      }
    };
    const flushList = () => {
      if (listItems.length) {
        blocks.push({ kind: "list", items: listItems });
        listItems = [];
      }
    };
    const flushSpecs = () => {
      if (specRows.length) {
        blocks.push({ kind: "specs", rows: specRows });
        specRows = [];
      }
    };

    for (const line of lines) {
      if (BULLET.test(line)) {
        flushParagraph();
        flushSpecs();
        listItems.push(line.replace(BULLET, "").trim());
        continue;
      }

      const spec = SPEC.exec(line);
      // Значение в одно-два предложения — характеристика; длинный текст
      // с двоеточием внутри остаётся абзацем.
      if (spec && spec[2].length <= 160) {
        flushParagraph();
        flushList();
        specRows.push({ label: spec[1].trim(), value: spec[2].trim() });
        continue;
      }

      if (isHeading(line) && lines.length > 1) {
        flushParagraph();
        flushList();
        flushSpecs();
        blocks.push({ kind: "heading", text: line });
        continue;
      }

      flushList();
      flushSpecs();
      buffer.push(line);
    }

    flushParagraph();
    flushList();
    flushSpecs();
  }

  return blocks;
}
