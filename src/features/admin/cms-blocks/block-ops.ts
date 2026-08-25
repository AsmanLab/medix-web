import { newBlockId, type Block, type BlockType } from "@/features/cms/blocks/schema";

/** Пустой блок каждого типа — то, что появляется по кнопке «+ Заголовок» и т.д. */
export function createBlock(type: BlockType): Block {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type: "heading", text: "", level: 2 };
    case "text":
      return { id, type: "text", text: "" };
    case "image":
      return { id, type: "image", key: "", alt: "", caption: "" };
    case "gallery":
      return { id, type: "gallery", items: [] };
    case "stats":
      return { id, type: "stats", items: [] };
    case "text_image":
      return { id, type: "text_image", text: "", key: "", alt: "", imageSide: "right" };
  }
}

export function addBlock(blocks: Block[], type: BlockType): Block[] {
  return [...blocks, createBlock(type)];
}

export function updateBlock(blocks: Block[], id: string, patch: Partial<Block>): Block[] {
  return blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as Block) : block));
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks.filter((block) => block.id !== id);
}

export function moveBlock(blocks: Block[], id: string, direction: "up" | "down"): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index === -1) return blocks;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = [...blocks];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
