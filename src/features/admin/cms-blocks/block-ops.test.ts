import { describe, expect, it } from "vitest";
import { addBlock, moveBlock, removeBlock, updateBlock } from "./block-ops";
import type { Block } from "@/features/cms/blocks/schema";

describe("addBlock", () => {
  it("appends a new block of the requested type with a unique id", () => {
    const blocks = addBlock(addBlock([], "heading"), "text");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "text"]);
    expect(new Set(blocks.map((b) => b.id)).size).toBe(2);
  });
});

describe("moveBlock", () => {
  const blocks: Block[] = [
    { id: "a", type: "heading", text: "A", level: 2 },
    { id: "b", type: "heading", text: "B", level: 2 },
    { id: "c", type: "heading", text: "C", level: 2 },
  ];

  it("swaps with the previous block", () => {
    expect(moveBlock(blocks, "b", "up").map((b) => b.id)).toEqual(["b", "a", "c"]);
  });

  it("swaps with the next block", () => {
    expect(moveBlock(blocks, "b", "down").map((b) => b.id)).toEqual(["a", "c", "b"]);
  });

  it("moving the first block up is a no-op", () => {
    expect(moveBlock(blocks, "a", "up")).toEqual(blocks);
  });

  it("moving the last block down is a no-op", () => {
    expect(moveBlock(blocks, "c", "down")).toEqual(blocks);
  });
});

describe("updateBlock / removeBlock", () => {
  it("updates only the matching block", () => {
    const blocks: Block[] = [
      { id: "a", type: "heading", text: "A", level: 2 },
      { id: "b", type: "heading", text: "B", level: 2 },
    ];
    const next = updateBlock(blocks, "a", { text: "Changed" });
    expect(next[0]).toMatchObject({ text: "Changed" });
    expect(next[1]).toMatchObject({ text: "B" });
  });

  it("removes only the matching block", () => {
    const blocks: Block[] = [
      { id: "a", type: "heading", text: "A", level: 2 },
      { id: "b", type: "heading", text: "B", level: 2 },
    ];
    expect(removeBlock(blocks, "a").map((b) => b.id)).toEqual(["b"]);
  });
});
