import { describe, expect, it } from "vitest";
import { sanitizeCmsHtml } from "@/features/cms/sanitize";
import { collectBlockImageKeys, hasBlocks, parsePageContent, type Block } from "./schema";
import { blocksToHtml, splitTextBlock } from "./to-html";
import { htmlToBlocks } from "./from-html";

const HEADING: Block = { id: "1", type: "heading", text: "О компании", level: 2 };
const TEXT: Block = { id: "2", type: "text", text: "Мы на рынке 15 лет.\n\n- Первое\n- Второе" };
const IMAGE: Block = { id: "3", type: "image", key: "cms/a.jpg", alt: "Офис", caption: "Наш офис" };
const GALLERY: Block = {
  id: "4",
  type: "gallery",
  items: [
    { key: "cms/b.jpg", alt: "" },
    { key: "cms/c.jpg", alt: "" },
  ],
};
const STATS: Block = {
  id: "5",
  type: "stats",
  items: [{ value: "20+", label: "лет на рынке" }],
};
const TEXT_IMAGE: Block = {
  id: "6",
  type: "text_image",
  text: "Текст рядом с фото",
  key: "cms/d.jpg",
  alt: "",
  imageSide: "right",
};

const ALL_BLOCKS = [HEADING, TEXT, IMAGE, GALLERY, STATS, TEXT_IMAGE];

describe("parsePageContent", () => {
  it("returns null for anything that is not an array", () => {
    expect(parsePageContent(null)).toBeNull();
    expect(parsePageContent(undefined)).toBeNull();
    expect(parsePageContent("not an array")).toBeNull();
    expect(parsePageContent({ blocks: [] })).toBeNull();
  });

  it("parses a valid array of blocks", () => {
    const parsed = parsePageContent([HEADING, TEXT]);
    expect(parsed).toEqual([HEADING, TEXT]);
  });

  it("drops blocks with an unrecognised type instead of failing the whole page", () => {
    const parsed = parsePageContent([HEADING, { id: "x", type: "video", url: "x" }]);
    expect(parsed).toEqual([HEADING]);
  });
});

describe("hasBlocks", () => {
  it("is false for null and an empty array", () => {
    expect(hasBlocks(null)).toBe(false);
    expect(hasBlocks([])).toBe(false);
  });

  it("is true for a non-empty array", () => {
    expect(hasBlocks([HEADING])).toBe(true);
  });
});

describe("collectBlockImageKeys", () => {
  it("collects keys from image, gallery and text_image blocks, deduped and sorted", () => {
    const keys = collectBlockImageKeys([
      IMAGE,
      GALLERY,
      TEXT_IMAGE,
      { ...IMAGE, id: "dup", key: IMAGE.key },
      HEADING,
    ]);
    expect(keys).toEqual(["cms/a.jpg", "cms/b.jpg", "cms/c.jpg", "cms/d.jpg"]);
  });
});

describe("splitTextBlock", () => {
  it("splits paragraphs on blank lines", () => {
    expect(splitTextBlock("Первый абзац.\n\nВторой абзац.")).toEqual([
      { kind: "p", text: "Первый абзац." },
      { kind: "p", text: "Второй абзац." },
    ]);
  });

  it("turns a run of '- ' lines into a list", () => {
    expect(splitTextBlock("- Раз\n- Два\n- Три")).toEqual([
      { kind: "ul", items: ["Раз", "Два", "Три"] },
    ]);
  });

  it("keeps mixed paragraphs and lists in order", () => {
    expect(splitTextBlock("Вступление.\n\n- Раз\n- Два\n\nЗаключение.")).toEqual([
      { kind: "p", text: "Вступление." },
      { kind: "ul", items: ["Раз", "Два"] },
      { kind: "p", text: "Заключение." },
    ]);
  });
});

describe("blocksToHtml", () => {
  it("escapes markup inside user text instead of injecting it", () => {
    const html = blocksToHtml([{ id: "1", type: "heading", text: "<script>alert(1)</script>", level: 2 }]);
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes ampersands so the output stays well-formed", () => {
    const html = blocksToHtml([{ id: "1", type: "text", text: "Кофе и чай & печенье" }]);
    expect(html).toContain("&amp;");
    expect(html).not.toContain(" & ");
  });

  it("round-trips through the sanitizer without losing content", () => {
    const html = blocksToHtml(ALL_BLOCKS);
    expect(sanitizeCmsHtml(html)).toBe(html);
  });

  it("renders images through the /raw redirect, not a presigned URL", () => {
    const html = blocksToHtml([IMAGE]);
    expect(html).toContain("/api/v1/media/cms/a.jpg/raw");
  });
});

describe("htmlToBlocks", () => {
  it("converts headings and paragraphs", () => {
    const blocks = htmlToBlocks("<h2>О компании</h2><p>Мы на рынке 15 лет.</p>");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: "heading", text: "О компании", level: 2 });
    expect(blocks[1]).toMatchObject({ type: "text", text: "Мы на рынке 15 лет." });
  });

  it("converts a list into bullet-marked text", () => {
    const blocks = htmlToBlocks("<ul><li>Раз</li><li>Два</li></ul>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "text", text: "- Раз\n- Два" });
  });

  it("skips images instead of inventing a fake S3 key for an external URL", () => {
    const blocks = htmlToBlocks('<p>Текст</p><img src="https://example.test/photo.jpg">');
    expect(blocks).toHaveLength(1);
    expect(blocks.some((b) => b.type === "image")).toBe(false);
  });
});
