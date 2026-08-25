import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { splitTextBlock } from "./to-html";
import { useBlockImages } from "./useBlockImages";
import type { Block } from "./schema";

type PageBlocksProps = { blocks: Block[]; className?: string };

/**
 * Единственный рендерер блоков — используется и на витрине, и в превью
 * редактора (`CmsPageEditor`). Не «похожий» компонент, а буквально тот же
 * импорт: иначе превью в админке и живая страница разойдутся при первой же
 * правке стилей.
 */
export function PageBlocks({ blocks, className }: PageBlocksProps) {
  const { urls, isLoading } = useBlockImages(blocks);

  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} urls={urls} imagesLoading={isLoading} />
      ))}
    </div>
  );
}

function TextChunks({ text }: { text: string }) {
  const chunks = splitTextBlock(text);
  return (
    <div className="space-y-3 text-sm leading-7 text-foreground">
      {chunks.map((chunk, i) =>
        chunk.kind === "p" ? (
          <p key={i}>{chunk.text}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {chunk.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function BlockImage({
  src,
  alt,
  loading,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  loading: boolean;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-muted", className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Skeleton className={cn("h-full w-full rounded-none", !loading && "opacity-40")} />
      )}
    </div>
  );
}

function BlockView({
  block,
  urls,
  imagesLoading,
}: {
  block: Block;
  urls: Record<string, string | null>;
  imagesLoading: boolean;
}) {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2 className="font-display text-xl font-bold">{block.text}</h2>
      ) : (
        <h3 className="text-lg font-semibold">{block.text}</h3>
      );

    case "text":
      return <TextChunks text={block.text} />;

    case "image":
      return (
        <figure>
          <BlockImage
            src={urls[block.key]}
            alt={block.alt}
            loading={imagesLoading}
            className="aspect-video"
          />
          {block.caption ? (
            <figcaption className="mt-2 text-xs text-muted-foreground">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    case "gallery":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {block.items.map((item, i) => (
            <BlockImage
              key={i}
              src={urls[item.key]}
              alt={item.alt}
              loading={imagesLoading}
              className="aspect-square"
            />
          ))}
        </div>
      );

    case "stats":
      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background p-4 text-center">
              <div className="font-display text-2xl font-bold text-primary">{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      );

    case "text_image":
      return (
        <div className="grid items-center gap-6 lg:grid-cols-2">
          <div className={block.imageSide === "left" ? "lg:order-2" : ""}>
            <TextChunks text={block.text} />
          </div>
          <BlockImage
            src={urls[block.key]}
            alt={block.alt}
            loading={imagesLoading}
            className={cn("aspect-video", block.imageSide === "left" ? "lg:order-1" : "")}
          />
        </div>
      );
  }
}
