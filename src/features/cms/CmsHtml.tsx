import { sanitizeCmsHtml } from "@/features/cms/sanitize";
import { cn } from "@/lib/utils";

type CmsHtmlProps = {
  html: string;
  className?: string;
};

/** Renders sanitized CMS HTML body. */
export function CmsHtml({ html, className }: CmsHtmlProps) {
  const clean = sanitizeCmsHtml(html);
  if (!clean.trim()) {
    return (
      <p className="text-sm text-muted-foreground">Контент пока не заполнен.</p>
    );
  }
  return (
    <div
      className={cn(
        "cms-prose space-y-3 text-sm leading-7 text-foreground",
        "[&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold",
        "[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold",
        "[&_h3]:text-lg [&_h3]:font-semibold",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_img]:max-w-full [&_img]:rounded-2xl",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
