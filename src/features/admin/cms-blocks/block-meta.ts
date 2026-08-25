import { AlignLeft, BarChart3, Columns3, Heading, Image, Images } from "lucide-react";
import type { BlockType } from "@/features/cms/blocks/schema";

export const BLOCK_TYPES: BlockType[] = [
  "heading",
  "text",
  "image",
  "gallery",
  "stats",
  "text_image",
];

export const BLOCK_META: Record<BlockType, { label: string; icon: typeof Heading }> = {
  heading: { label: "Заголовок", icon: Heading },
  text: { label: "Текст", icon: AlignLeft },
  image: { label: "Фото", icon: Image },
  gallery: { label: "Галерея", icon: Images },
  stats: { label: "Цифры", icon: BarChart3 },
  text_image: { label: "Текст рядом с фото", icon: Columns3 },
};
