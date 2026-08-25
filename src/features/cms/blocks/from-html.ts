import { newBlockId, type Block } from "./schema";

/**
 * Лучшее приближение блоков из старого ручного HTML — только для кнопки
 * «Пересобрать в блоках» в редакторе. Заведомо теряет то, что в блоки не
 * укладывается: картинки по внешней ссылке нельзя превратить в блок «Фото» —
 * он ждёт ключ объекта в S3 (`imageKey`), а не произвольный URL, поэтому
 * `<img>` и таблицы пропускаются, а не превращаются в блок с битой ссылкой.
 * Результат показывается пользователю на подтверждение — молчаливой замены
 * содержимого нет.
 */
export function htmlToBlocks(html: string): Block[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: Block[] = [];

  for (const node of Array.from(doc.body.children)) {
    const tag = node.tagName.toLowerCase();
    const text = node.textContent?.trim() ?? "";

    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      if (!text) continue;
      const level = tag === "h1" || tag === "h2" ? 2 : 3;
      blocks.push({ id: newBlockId(), type: "heading", text, level });
    } else if (tag === "p" || tag === "blockquote") {
      if (text) blocks.push({ id: newBlockId(), type: "text", text });
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll("li"))
        .map((li) => li.textContent?.trim() ?? "")
        .filter(Boolean);
      if (items.length) {
        blocks.push({
          id: newBlockId(),
          type: "text",
          text: items.map((item) => `- ${item}`).join("\n"),
        });
      }
    }
    // <img>, <table> и всё остальное сознательно пропускаются — см. докстринг.
  }

  return blocks;
}
