import { Plus, X } from "lucide-react";
import { ImagePicker } from "./ImagePicker";
import type { Block } from "@/features/cms/blocks/schema";

type BlockFormProps = {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
};

/** Форма редактирования одного блока — один свитч на все шесть типов. */
export function BlockForm({ block, onChange }: BlockFormProps) {
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-3">
          <input
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="О компании"
            className="field-control"
          />
          <div className="flex gap-2 text-xs font-semibold">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                checked={block.level === 2}
                onChange={() => onChange({ level: 2 })}
              />
              Крупный
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                checked={block.level === 3}
                onChange={() => onChange({ level: 3 })}
              />
              Обычный
            </label>
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-1.5">
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={"Абзац текста.\n\nПустая строка — новый абзац.\n- пункт списка\n- ещё пункт"}
            className="field-control min-h-[140px] py-2"
          />
          <p className="text-xs text-muted-foreground">
            Пустая строка между абзацами. Строка, начинающаяся с «- », станет пунктом списка.
          </p>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <ImagePicker imageKey={block.key} onChange={(key) => onChange({ key })} />
          <input
            value={block.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Подпись под фото (необязательно)"
            className="field-control"
          />
          <input
            value={block.alt}
            onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Описание фото для незрячих пользователей (необязательно)"
            className="field-control"
          />
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {block.items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                <ImagePicker
                  imageKey={item.key}
                  onChange={(key) => {
                    const items = [...block.items];
                    items[i] = { ...items[i], key };
                    onChange({ items });
                  }}
                />
                <div className="flex items-center gap-2">
                  <input
                    value={item.alt}
                    onChange={(e) => {
                      const items = [...block.items];
                      items[i] = { ...items[i], alt: e.target.value };
                      onChange({ items });
                    }}
                    placeholder="Описание (необязательно)"
                    className="field-control flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) })}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Убрать фото"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ items: [...block.items, { key: "", alt: "" }] })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Добавить фото
          </button>
        </div>
      );

    case "stats":
      return (
        <div className="space-y-3">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item.value}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...items[i], value: e.target.value };
                  onChange({ items });
                }}
                placeholder="20+"
                className="field-control w-28"
              />
              <input
                value={item.label}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...items[i], label: e.target.value };
                  onChange({ items });
                }}
                placeholder="лет на рынке"
                className="field-control flex-1"
              />
              <button
                type="button"
                onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) })}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Убрать"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ items: [...block.items, { value: "", label: "" }] })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Добавить цифру
          </button>
        </div>
      );

    case "text_image":
      return (
        <div className="space-y-3">
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Текст рядом с фото"
            className="field-control min-h-[120px] py-2"
          />
          <ImagePicker imageKey={block.key} onChange={(key) => onChange({ key })} />
          <input
            value={block.alt}
            onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Описание фото для незрячих пользователей (необязательно)"
            className="field-control"
          />
          <div className="flex gap-2 text-xs font-semibold">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                checked={block.imageSide === "right"}
                onChange={() => onChange({ imageSide: "right" })}
              />
              Фото справа
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                checked={block.imageSide === "left"}
                onChange={() => onChange({ imageSide: "left" })}
              />
              Фото слева
            </label>
          </div>
        </div>
      );
  }
}
