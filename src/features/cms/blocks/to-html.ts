import { mediaRawUrl } from "@/api/media";
import type { Block } from "./schema";

/**
 * `blocks → HTML`, вызывается при сохранении страницы: `body_html` остаётся
 * рабочим fallback-представлением для любого потребителя, который блоков не
 * понимает (`CmsHtml`, если `content_json` не распознан).
 *
 * Намеренно не расширяет список тегов в `sanitize.ts` (`figure`, `div` и
 * т.п.) — реальная раскладка блоков живёт в `PageBlocks.tsx` и рисуется
 * React'ом из `content_json`, а `body_html` — линейный текстовый fallback,
 * расширять для него разрешённые теги смысла нет.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type TextChunk = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** Пустая строка делит абзацы; строки, начинающиеся с "- " или "• " — пункты списка. */
export function splitTextBlock(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const isList = lines.every((line) => /^[-•]\s+/.test(line));
    if (isList) {
      chunks.push({ kind: "ul", items: lines.map((line) => line.replace(/^[-•]\s+/, "")) });
    } else {
      chunks.push({ kind: "p", text: lines.join(" ") });
    }
  }
  return chunks;
}

function textChunksToHtml(text: string): string {
  return splitTextBlock(text)
    .map((chunk) =>
      chunk.kind === "p"
        ? `<p>${escapeHtml(chunk.text)}</p>`
        : `<ul>${chunk.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    )
    .join("");
}

function imageHtml(key: string, alt: string): string {
  return `<p><img src="${escapeHtml(mediaRawUrl(key))}" alt="${escapeHtml(alt)}"></p>`;
}

function blockToHtml(block: Block): string {
  switch (block.type) {
    case "heading":
      return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
    case "text":
      return textChunksToHtml(block.text);
    case "image":
      return (
        imageHtml(block.key, block.alt) +
        (block.caption ? `<p><em>${escapeHtml(block.caption)}</em></p>` : "")
      );
    case "gallery":
      return block.items.map((item) => imageHtml(item.key, item.alt)).join("");
    case "stats":
      return `<ul>${block.items
        .map((item) => `<li><strong>${escapeHtml(item.value)}</strong> — ${escapeHtml(item.label)}</li>`)
        .join("")}</ul>`;
    case "text_image":
      return imageHtml(block.key, block.alt) + textChunksToHtml(block.text);
  }
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(blockToHtml).join("");
}
