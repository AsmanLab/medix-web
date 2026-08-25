import { z } from "zod";

/**
 * Блоки конструктора CMS-страниц. Заказчик не пишет HTML — он собирает
 * страницу из этих типов, а `content_json` хранит их как есть.
 *
 * `level` у заголовка — только 2|3, никогда 1: обе витринные страницы уже
 * рисуют `<h1>{page.title}</h1>` над телом (about.tsx, pages/$slug.tsx),
 * блок-заголовок первого уровня дал бы два h1 на странице.
 */

const imageRefSchema = z.object({
  key: z.string().min(1),
  alt: z.string().default(""),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("heading"),
    text: z.string(),
    level: z.union([z.literal(2), z.literal(3)]).default(2),
  }),
  z.object({
    id: z.string(),
    type: z.literal("text"),
    // Обычный текст, не HTML: пустая строка делит абзацы, строка с "- " —
    // пункт списка. Разбор — features/cms/blocks/to-html.ts.
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("image"),
    key: z.string().min(1),
    alt: z.string().default(""),
    caption: z.string().default(""),
  }),
  z.object({
    id: z.string(),
    type: z.literal("gallery"),
    items: z.array(imageRefSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("stats"),
    items: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  z.object({
    id: z.string(),
    type: z.literal("text_image"),
    text: z.string(),
    key: z.string().min(1),
    alt: z.string().default(""),
    imageSide: z.union([z.literal("left"), z.literal("right")]).default("right"),
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

/**
 * `content_json` с бэкенда — `unknown`, а не `Block[]`: бэкенд валидирует его
 * только поверхностно (см. medix-core/app/modules/cms/presentation/router.py).
 * Возвращает `null`, если это вообще не массив блоков (старая HTML-страница
 * или битые данные) — тогда рендерер падает на `body_html`. Блок с
 * нераспознанным `type` внутри валидного массива молча пропускается —
 * совместимость со старым бандлом витрины, если админка сохранит новый тип.
 */
export function parsePageContent(raw: unknown): Block[] | null {
  if (!Array.isArray(raw)) return null;
  const blocks: Block[] = [];
  for (const item of raw) {
    const parsed = blockSchema.safeParse(item);
    if (parsed.success) blocks.push(parsed.data);
  }
  return blocks;
}

/** Есть ли что показать из блоков — используется вместо просто `content_json`. */
export function hasBlocks(blocks: Block[] | null): blocks is Block[] {
  return blocks !== null && blocks.length > 0;
}

/**
 * `crypto.randomUUID()` доступен только в secure context — на `localhost`
 * и https, но не на `http://192.168.x.x:8080`, откуда админку тоже открывают
 * с телефона на стенде. Без фолбэка добавление блока там падало бы.
 */
export function newBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // ignore — сваливаемся в фолбэк ниже
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function collectBlockImageKeys(blocks: Block[]): string[] {
  const keys = new Set<string>();
  for (const block of blocks) {
    if (block.type === "image" || block.type === "text_image") keys.add(block.key);
    if (block.type === "gallery") for (const item of block.items) keys.add(item.key);
  }
  return [...keys].sort();
}
