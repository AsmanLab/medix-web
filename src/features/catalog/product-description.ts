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
 * Решение по строке принимается не по ней одной, а по контексту — по тому,
 * что стоит рядом (через пустые строки тоже): длинное значение или заголовок
 * с двоеточием без соседних характеристик — редкость, а вот характеристика
 * рядом с другой характеристикой — обычное дело в спецификациях техники.
 * Поэтому лимит на длину значения действует только для ОДИНОКОЙ строки —
 * внутри уже опознанного блока характеристик длина не ограничена.
 *
 * Разбор всё равно консервативен: то, что не опознано уверенно, остаётся
 * обычным абзацем — исказить смысл хуже, чем не разметить.
 */

export type DescriptionBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "specs"; rows: { label: string; value: string }[] };

const BULLET = /^\s*[•·*—-]\s+/;

/** Название характеристики — короткая фраза, не предложение. */
const LABEL_MAX_CHARS = 64;
const LABEL_MAX_WORDS = 6;

/** Лимит на значение действует только для строки без соседей — см. заголовок файла. */
const SOLO_VALUE_MAX_CHARS = 80;

/** Точка/восклицание/вопрос, за которыми начинается новое предложение с заглавной. */
const SENTENCE_BREAK = /[.!?]\s+\p{Lu}/u;

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

function isSpecLabel(label: string): boolean {
  return (
    label.length >= 2 &&
    label.length <= LABEL_MAX_CHARS &&
    label.split(/\s+/).length <= LABEL_MAX_WORDS &&
    !/[.;!?]/.test(label) &&
    /^[0-9A-Za-zА-ЯЁа-яё]/.test(label)
  );
}

/** Заголовок раздела написан как «Название:» — без значения после двоеточия. */
function isSectionHeader(text: string, label: string): boolean {
  return (
    text.length <= 60 &&
    label.split(/\s+/).length <= 5 &&
    /^[А-ЯЁA-Z]/.test(label)
  );
}

type Line = { text: string; gapBefore: boolean };

/**
 * Строки без разбивки на куски по пустым строкам: пустая строка становится
 * флагом у следующей строки, а не границей разбора. Иначе строка характеристики,
 * которую админ отделил пустыми строками от соседних (частая привычка), теряет
 * контекст — не с кем сравнить, чтобы понять, что это таблица, а не абзац.
 */
function normalize(raw: string): Line[] {
  const lines: Line[] = [];
  let gap = false;
  for (const rawLine of raw.replace(/\r\n/g, "\n").split("\n")) {
    const text = rawLine.trim();
    if (!text) {
      if (lines.length > 0) gap = true;
      continue;
    }
    lines.push({ text, gapBefore: gap });
    gap = false;
  }
  return lines;
}

type Shape =
  | { kind: "bullet"; text: string }
  | { kind: "spec"; label: string; value: string }
  | { kind: "section"; label: string }
  | { kind: "none" };

function splitColon(text: string): { label: string; value: string } {
  const idx = text.indexOf(":");
  return idx === -1
    ? { label: text, value: "" }
    : { label: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
}

function shapeOf(line: Line): Shape {
  if (BULLET.test(line.text)) {
    return { kind: "bullet", text: line.text.replace(BULLET, "").trim() };
  }

  if (!line.text.includes(":")) return { kind: "none" };

  // Делим по ПЕРВОМУ двоеточию: значение вправе содержать свои двоеточия
  // («Определяемые параметры: 25 + 4 исследовательских: WBC, RBC, …») —
  // это не должно разбить характеристику на две.
  const { label, value } = splitColon(line.text);
  if (!isSpecLabel(label)) return { kind: "none" };

  if (value !== "") return { kind: "spec", label, value };
  if (isSectionHeader(line.text, label)) return { kind: "section", label };
  return { kind: "none" };
}

type Role =
  | { kind: "bullet"; text: string }
  | { kind: "spec"; label: string; value: string }
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string };

function resolveRole(lines: Line[], shapes: Shape[], i: number): Role {
  const shape = shapes[i];
  const text = lines[i].text;

  if (shape.kind === "bullet") {
    return { kind: "bullet", text: shape.text };
  }

  // «Заголовок раздела:» становится подзаголовком, только если он и правда
  // что-то заголовочит — за ним идёт список или характеристики. Иначе это
  // просто короткая фраза с двоеточием, и разметка исказила бы смысл.
  if (shape.kind === "section") {
    const next = shapes[i + 1];
    if (next && next.kind !== "none") {
      return { kind: "heading", text: shape.label };
    }
  }

  if (shape.kind === "spec") {
    const prev = shapes[i - 1];
    const next = shapes[i + 1];
    // В ряду характеристик (или сразу под заголовком-якорем) длина значения
    // не ограничена — соседи уже доказывают, что это таблица, а не абзац.
    const inRun =
      prev?.kind === "spec" || next?.kind === "spec" || prev?.kind === "section";
    const isolatedOk =
      shape.value.length <= SOLO_VALUE_MAX_CHARS && !SENTENCE_BREAK.test(shape.value);
    if (inRun || isolatedOk) {
      return { kind: "spec", label: shape.label, value: shape.value };
    }
    // Иначе — слишком похоже на предложение с двоеточием внутри, остаётся текстом.
  }

  const next = shapes[i + 1];
  if (isHeading(text) && next && next.kind !== "none") {
    return { kind: "heading", text };
  }

  return { kind: "text", text };
}

export function parseDescription(raw: string | null | undefined): DescriptionBlock[] {
  if (!raw?.trim()) return [];

  const lines = normalize(raw);
  const shapes = lines.map(shapeOf);
  const roles = lines.map((_, i) => resolveRole(lines, shapes, i));

  const blocks: DescriptionBlock[] = [];
  let paragraphBuffer: string[] = [];
  let openList: string[] | null = null;
  let openSpecs: { label: string; value: string }[] | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ kind: "paragraph", text: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  };
  const closeOpenBlocks = () => {
    if (openList) {
      blocks.push({ kind: "list", items: openList });
      openList = null;
    }
    if (openSpecs) {
      blocks.push({ kind: "specs", rows: openSpecs });
      openSpecs = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const role = roles[i];

    if (role.kind === "bullet") {
      flushParagraph();
      // Пустая строка между пунктами не должна дробить список на N отдельных
      // однопунктовых списков — админы часто отбивают каждую строку пустой.
      if (!openList) {
        closeOpenBlocks();
        openList = [];
      }
      openList.push(role.text);
      continue;
    }

    if (role.kind === "spec") {
      flushParagraph();
      // То же самое для характеристик — см. комментарий у списка выше.
      if (!openSpecs) {
        closeOpenBlocks();
        openSpecs = [];
      }
      openSpecs.push({ label: role.label, value: role.value });
      continue;
    }

    if (role.kind === "heading") {
      flushParagraph();
      closeOpenBlocks();
      blocks.push({ kind: "heading", text: role.text });
      continue;
    }

    // Обычный текст: список/таблицу закрываем всегда (смена типа блока), а
    // абзац — только если перед строкой была пустая строка (граница смысла).
    closeOpenBlocks();
    if (lines[i].gapBefore) flushParagraph();
    paragraphBuffer.push(role.text);
  }

  flushParagraph();
  closeOpenBlocks();

  return blocks;
}
