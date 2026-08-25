import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { addBlock, moveBlock, removeBlock, updateBlock } from "./block-ops";
import { BLOCK_META, BLOCK_TYPES } from "./block-meta";
import { BlockForm } from "./BlockForm";
import type { Block } from "@/features/cms/blocks/schema";

type BlockListEditorProps = {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
};

/** Есть ли в блоке содержимое, ради которого стоит спросить подтверждение удаления. */
function blockHasContent(block: Block): boolean {
  switch (block.type) {
    case "heading":
    case "text":
      return block.text.trim().length > 0;
    case "image":
      return block.key.trim().length > 0 || block.caption.trim().length > 0;
    case "text_image":
      return block.key.trim().length > 0 || block.text.trim().length > 0;
    case "gallery":
    case "stats":
      return block.items.length > 0;
  }
}

function AddBlockRow({ onAdd }: { onAdd: (type: Block["type"]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BLOCK_TYPES.map((type) => {
        const meta = BLOCK_META[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <meta.icon className="h-3.5 w-3.5" aria-hidden />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

export function BlockListEditor({ blocks, onChange }: BlockListEditorProps) {
  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          Страница пустая. Добавьте первый блок.
        </div>
      ) : null}

      {blocks.map((block, index) => {
        const meta = BLOCK_META[block.type];
        return (
          <div key={block.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <meta.icon className="h-3.5 w-3.5" aria-hidden />
                {meta.label}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onChange(moveBlock(blocks, block.id, "up"))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Переместить вверх"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={index === blocks.length - 1}
                  onClick={() => onChange(moveBlock(blocks, block.id, "down"))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Переместить вниз"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (blockHasContent(block) && !window.confirm("Удалить блок?")) return;
                    onChange(removeBlock(blocks, block.id));
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger-strong"
                  aria-label="Удалить блок"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <BlockForm block={block} onChange={(patch) => onChange(updateBlock(blocks, block.id, patch))} />
          </div>
        );
      })}

      <AddBlockRow onAdd={(type) => onChange(addBlock(blocks, type))} />
    </div>
  );
}
