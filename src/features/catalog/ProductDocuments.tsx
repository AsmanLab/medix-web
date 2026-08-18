import { Download, FileText } from "lucide-react";
import type { ProductDocumentOut } from "@/api/generated/schemas";

/**
 * Документация товара: регистрационные удостоверения, паспорта, инструкции.
 *
 * Ссылки на файлы — presigned-адреса со сроком жизни в час, поэтому открываем
 * их в новой вкладке и не кэшируем.
 *
 * `url` приходит пустым, когда подписать ссылку не удалось (файл потерян в
 * хранилище). Строка в этом случае остаётся, но неактивной: молча спрятать
 * документ хуже — админ не узнает, что файл пропал.
 */
export function ProductDocuments({
  documents,
}: {
  documents: ProductDocumentOut[];
}) {
  return (
    <ul className="space-y-2">
      {documents.map((doc) => {
        const inner = (
          <>
            <FileText
              className="h-5 w-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {doc.name}
            </span>
          </>
        );

        return (
          <li key={doc.id}>
            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border px-3 py-2.5 transition hover:border-primary/40 hover:bg-secondary/40"
              >
                {inner}
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
                  <Download className="h-4 w-4" aria-hidden />
                  Скачать
                </span>
              </a>
            ) : (
              <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-dashed border-border px-3 py-2.5 text-muted-foreground">
                {inner}
                <span className="shrink-0 text-xs">файл недоступен</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
