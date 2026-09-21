/**
 * Место в каталоге, откуда пользователь ушёл смотреть товар — категория,
 * фильтры, число догруженных страниц и позиция скролла.
 *
 * sessionStorage, а не router state: state роутера теряется при обновлении
 * страницы (F5) и при заходе на карточку товара по прямой ссылке — а именно
 * в этих случаях кнопке «Назад» и нужно вести в каталог, а не никуда.
 */

import { useEffect, useRef } from "react";

const KEY = "medix.catalog.return.v1";

/** Старше этого — запись считается неактуальной и не используется. */
const MAX_AGE_MS = 30 * 60 * 1000;

export type CatalogReturnState = {
  pathname: string;
  search: string;
  scrollY: number;
  /**
   * Сколько страниц каталога было догружено «Показать ещё» на момент ухода.
   * Без этого восстановление скролла работало бы только в пределах первой
   * страницы — товары со второй и далее просто не успели бы отрендериться.
   */
  pageCount: number;
  savedAt: number;
};

export function saveCatalogReturn(
  state: Omit<CatalogReturnState, "savedAt">,
): void {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...state, savedAt: Date.now() } satisfies CatalogReturnState),
    );
  } catch {
    // Приватный режим или заблокированное хранилище — переживаем молча,
    // кнопка «Назад» просто уйдёт в общий каталог.
  }
}

export function readCatalogReturn(): CatalogReturnState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogReturnState;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCatalogReturn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // см. saveCatalogReturn
  }
}

/**
 * Куда ведёт кнопка «Назад» на карточке товара: к сохранённому месту в
 * каталоге, а если записи нет или она устарела — в общий каталог.
 */
export function catalogReturnHref(): string {
  const entry = readCatalogReturn();
  return entry ? entry.pathname + entry.search : "/catalog";
}

type RestorableProductsQuery = {
  data: { pages: unknown[][] } | undefined;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

/**
 * Восстанавливает страницу и позицию скролла при возврате из товара.
 *
 * Догружает страницы по одной, пока их число не догонит сохранённое, и
 * только тогда прокручивает — иначе `scrollY` целился бы в товары, которых
 * ещё нет в DOM. Срабатывает один раз за монтирование страницы: если запись
 * не относится к текущему адресу (пришли по-другому), восстанавливать
 * нечего.
 */
export function useCatalogReturnRestore(
  productsQuery: RestorableProductsQuery,
): void {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;

    const entry = readCatalogReturn();
    if (!entry) {
      doneRef.current = true;
      return;
    }
    if (
      entry.pathname !== window.location.pathname ||
      entry.search !== window.location.search
    ) {
      doneRef.current = true;
      return;
    }

    const loadedPages = productsQuery.data?.pages.length ?? 0;
    if (loadedPages === 0) return; // ждём первую страницу

    if (loadedPages < entry.pageCount) {
      if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
        productsQuery.fetchNextPage();
      }
      return;
    }

    doneRef.current = true;
    requestAnimationFrame(() => window.scrollTo(0, entry.scrollY));
    clearCatalogReturn();
  }, [
    productsQuery.data,
    productsQuery.hasNextPage,
    productsQuery.isFetchingNextPage,
    productsQuery.fetchNextPage,
  ]);
}
