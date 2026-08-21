import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  LayoutGrid,
  LogIn,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingCart,
  User,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchCategories } from "@/api/catalog";
import { LocaleSwitcher } from "@/i18n/LocaleSwitcher";
import { listNotifications } from "@/api/notifications";
import { queryKeys } from "@/api/query-keys";
import { fetchCart } from "@/api/cart";
import {
  buildCategoryTree,
  type CatalogCategoryNode,
} from "@/features/catalog/map-category";
import { useSession } from "@/session/store";
import { plural } from "@/lib/plural";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

type Tab = {
  to: string;
  /** Русский текст — сам служит ключом словаря, см. i18n/dictionaries.ts. */
  labelKey: string;
  icon: typeof LayoutGrid;
  match: (p: string) => boolean;
};

const mobileTabs: Tab[] = [
  {
    to: "/catalog",
    labelKey: "Каталог",
    icon: LayoutGrid,
    match: (p) => p.startsWith("/catalog") || p.startsWith("/product"),
  },
  {
    to: "/cart",
    labelKey: "Корзина",
    icon: ShoppingCart,
    match: (p) => p.startsWith("/cart"),
  },
  {
    to: "/orders",
    labelKey: "Заказы",
    icon: Package,
    match: (p) => p.startsWith("/orders") || p.startsWith("/requests"),
  },
  // Сервис — раздел ТЗ наравне с каталогом, но с телефона он был достижим
  // только через подвал, а подвал прячется под таб-баром.
  {
    to: "/service",
    labelKey: "Сервис",
    icon: Wrench,
    match: (p) => p.startsWith("/service"),
  },
  {
    to: "/profile",
    labelKey: "Профиль",
    icon: User,
    match: (p) =>
      p.startsWith("/profile") ||
      p.startsWith("/login") ||
      p.startsWith("/register"),
  },
];

function Logo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  const t = useT();
  return (
    <Link
      to="/"
      // min-h-11: в компактном виде значок 36px, и ссылка была ниже нормы
      // тач-таргета. Высота шапки 56px, поэтому 44 помещаются без правок.
      className="inline-flex min-h-11 shrink-0 items-center gap-3"
      aria-label={t("Medix — на главную")}
    >
      <span
        className={cn(
          "relative grid place-items-center rounded-[14px] bg-primary text-white shadow-[0_8px_22px_-8px_rgba(15,139,190,.6)]",
          compact ? "h-9 w-9" : "h-11 w-11",
        )}
      >
        <HeartPulse
          className={compact ? "h-5 w-5" : "h-6 w-6"}
          strokeWidth={2.3}
        />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display font-extrabold tracking-[-0.04em]",
            compact ? "text-lg" : "text-[22px]",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          medix
        </span>
        {!compact ? (
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            international
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** Сколько категорий третьего уровня помещается под подразделом в меню. */
const MEGA_MENU_LEAVES = 5;

function CatalogMegaMenu({
  categories,
  isLoading,
}: {
  categories: CatalogCategoryNode[];
  isLoading: boolean;
}) {
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);

  const menuCategory =
    categories.find((category) => category.id === menuCategoryId) ??
    categories[0] ??
    null;

  const catalogActive =
    path.startsWith("/catalog") || path.startsWith("/product");

  /*
   * Меню открывалось только через CSS-hover, поэтому на тач-устройствах
   * не открывалось вовсе: на планшете и в мобильном браузере в ландшафте
   * (где показывается десктопная шапка) категории были недостижимы.
   *
   * Раскрытием управляет состояние. Мышь по-прежнему открывает наведением,
   * но у шеврона появился отдельный переключатель: сама надпись «Каталог»
   * остаётся ссылкой и ведёт в каталог, а тап по шеврону раскрывает список.
   * Так работают оба сценария и ни один не отбирает у другого клик.
   */
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Меню закрывается при переходе — иначе оно висит поверх новой страницы.
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      // Наведение мышью оставляем как было; у пальца pointerType — "touch",
      // и открытие идёт через шеврон, иначе меню моргало бы на каждый тап.
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className="inline-flex items-center">
        <Link
          to="/catalog"
          search={{ q: undefined, category: undefined }}
          className={cn(
            "py-3",
            catalogActive
              ? "text-primary"
              : "text-foreground/75 hover:text-primary",
          )}
        >
          {t("Каталог")}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="catalog-mega-menu"
          aria-label={open ? t("Скрыть категории") : t("Показать категории")}
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-8 place-items-center text-foreground/75 hover:text-primary"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      <div
        id="catalog-mega-menu"
        role="navigation"
        aria-label={t("Каталог — категории")}
        hidden={!open}
        className="absolute top-full left-1/2 z-50 w-[min(900px,calc(100vw-2rem))] max-w-[900px] -translate-x-1/2 pt-[19px] xl:left-[-175px] xl:w-[900px] xl:translate-x-0"
      >
        <div className="grid overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_26px_70px_-28px_rgba(15,51,80,.45)] lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr]">
          <div className="border-r border-border bg-background/70 p-3">
            <div className="px-3 pt-1 pb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {t("Категории")}
            </div>
            {isLoading ? (
              <div className="space-y-2 px-2 py-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-muted/60"
                  />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {t("Категории скоро появятся")}
              </p>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onMouseEnter={() => setMenuCategoryId(category.id)}
                  onFocus={() => setMenuCategoryId(category.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition",
                    menuCategory?.id === category.id
                      ? "bg-card text-primary shadow-[var(--shadow-soft)]"
                      : "text-foreground/75 hover:bg-card",
                  )}
                >
                  <span>{category.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              ))
            )}
            <Link
              to="/catalog"
              search={{ q: undefined, category: undefined }}
              className="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary"
            >
              {t("Весь каталог")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-6">
            {menuCategory ? (
              <>
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] text-primary uppercase">
                      {menuCategory.children.length > 0
                        ? plural(
                            menuCategory.children.length,
                            t("подкатегория"),
                            t("подкатегории"),
                            t("подкатегорий"),
                          )
                        : t("Раздел")}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold">
                      {menuCategory.name}
                    </p>
                  </div>
                  <Link
                    to="/catalog/$categoryId"
                    params={{
                      categoryId: menuCategory.slug || menuCategory.id,
                    }}
                    search={{ subcategory: undefined, q: undefined }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    {t("Открыть раздел")} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {/*
                 * Два уровня в правой колонке: подраздел заголовком,
                 * его подкатегории списком под ним. Так меню показывает
                 * ветку целиком — «Гематология», а под ней
                 * «Гематологические анализаторы», — и до третьего уровня
                 * получается один переход, а не два.
                 *
                 * Ссылки ведут на `/catalog/{slug}` любого уровня: прежний
                 * `?subcategory=` описать три уровня уже не может.
                 */}
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
                  {menuCategory.children.length > 0 ? (
                    menuCategory.children.map((subcategory) => (
                      <div key={subcategory.id} className="min-w-0">
                        <Link
                          to="/catalog/$categoryId"
                          params={{
                            categoryId: subcategory.slug || subcategory.id,
                          }}
                          search={{ subcategory: undefined, q: undefined }}
                          className="block rounded-lg px-3 py-2 text-[13px] font-semibold transition hover:bg-background hover:text-primary"
                        >
                          {subcategory.name}
                        </Link>
                        {subcategory.children.length > 0 ? (
                          <ul className="mt-0.5">
                            {subcategory.children
                              .slice(0, MEGA_MENU_LEAVES)
                              .map((leaf) => (
                                <li key={leaf.id}>
                                  <Link
                                    to="/catalog/$categoryId"
                                    params={{
                                      categoryId: leaf.slug || leaf.id,
                                    }}
                                    search={{
                                      subcategory: undefined,
                                      q: undefined,
                                    }}
                                    className="block truncate rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition hover:bg-background hover:text-primary"
                                  >
                                    {leaf.name}
                                  </Link>
                                </li>
                              ))}
                            {/* Меню — не каталог: длинный список в нём
                                пришлось бы прокручивать, а прокрутка
                                внутри выпадающего меню закрывает его
                                мышью. Остаток открывается страницей. */}
                            {subcategory.children.length >
                            MEGA_MENU_LEAVES ? (
                              <li>
                                <Link
                                  to="/catalog/$categoryId"
                                  params={{
                                    categoryId:
                                      subcategory.slug || subcategory.id,
                                  }}
                                  search={{
                                    subcategory: undefined,
                                    q: undefined,
                                  }}
                                  className="block rounded-lg px-3 py-1.5 text-xs font-semibold text-primary"
                                >
                                  Ещё{" "}
                                  {subcategory.children.length -
                                    MEGA_MENU_LEAVES}
                                </Link>
                              </li>
                            ) : null}
                          </ul>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="col-span-2 text-sm text-muted-foreground">
                      {t("Подкатегории не добавлены")}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("Выберите категорию слева")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsBell({
  unreadCount,
  className,
}: {
  unreadCount: number;
  className?: string;
}) {
  const t = useT();
  return (
    <Link
      to="/notifications"
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-primary",
        className,
      )}
      aria-label={
        unreadCount > 0
          ? t("Уведомления, непрочитанных {count}", { count: unreadCount })
          : t("Уведомления")
      }
      title={t("Уведомления")}
    >
      <Bell className="h-[18px] w-[18px]" aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Ширина контентной колонки.
 *
 * `account` — узкие экраны кабинета (списки в одну колонку, формы).
 * `storefront` — витрина. `wide` — страницы, которым нужна вторая колонка,
 * но не вся ширина витрины: корзина с липким итогом.
 */
type ContentWidth = "account" | "storefront" | "wide";

const CONTENT_WIDTH: Record<ContentWidth, string> = {
  account: "max-w-[820px]",
  wide: "max-w-[1100px]",
  storefront: "max-w-[1320px]",
};

export function AppShell({
  children,
  width,
}: {
  children: ReactNode;
  /** Переопределяет ширину, вычисленную по адресу страницы. */
  width?: ContentWidth;
}) {
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const session = useSession();
  const authenticated = session.status === "authenticated";
  const [headerQuery, setHeaderQuery] = useState("");

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 5 * 60_000,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ signal }) => listNotifications(signal),
    enabled: authenticated && session.user?.role === "client",
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notificationsQuery.data?.unread_count ?? 0;

  // Корзина серверная, поэтому у гостя её просто нет — бейдж не показываем.
  const cartQuery = useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: ({ signal }) => fetchCart(signal),
    enabled: authenticated,
    staleTime: 30_000,
  });
  const cartCount = cartQuery.data?.items_count ?? 0;

  const categoryTree = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const accountPage =
    path.startsWith("/cart") ||
    path.startsWith("/orders") ||
    path.startsWith("/requests") ||
    path.startsWith("/notifications") ||
    path.startsWith("/profile") ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/service/requests");

  const profileTo = authenticated ? "/profile" : "/login";
  const profileLabel = authenticated ? t("Кабинет") : t("Войти");

  /*
   * Высота мобильной навигации публикуется в --bottom-nav-h.
   *
   * Липким панелям страниц (например «Итого + Оформить» в корзине) нужно
   * знать, на сколько подняться, чтобы не залезть под таб-бар. Зашивать
   * число нельзя: высота складывается из подписи, иконки и safe-area,
   * и на устройстве с домашней полосой она другая.
   *
   * На десктопе элемент скрыт через lg:hidden, высота нулевая, и панели
   * прижимаются к самому низу — то есть отдельного условия не нужно.
   */
  const bottomNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = bottomNavRef.current;
    if (!nav) return;

    const publish = () =>
      document.documentElement.style.setProperty(
        "--bottom-nav-h",
        `${nav.getBoundingClientRect().height}px`,
      );

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--bottom-nav-h");
    };
  }, []);

  function onHeaderSearch(event: React.FormEvent) {
    event.preventDefault();
    void navigate({
      to: "/catalog",
      search: { q: headerQuery.trim() || undefined, category: undefined },
    });
  }

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        {t("Перейти к содержимому")}
      </a>

      <div className="hidden border-b border-border/70 bg-card text-[12px] text-muted-foreground lg:block">
        <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {t("Бишкек, Кыргызстан")}
            </span>
            <a
              href="tel:+996312660066"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5 text-primary" /> +996 (312) 66-00-66
            </a>
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/service"
              className="transition-colors hover:text-primary"
            >
              {t("Сервис и ремонт")}
            </Link>
            <Link
              to="/contacts"
              className="transition-colors hover:text-primary"
            >
              {t("Контакты")}
            </Link>
            {/* Переключатель появится сам, когда в AVAILABLE_LOCALES
                добавят второй язык. Пока язык один, он не рисуется —
                ровно поэтому 10.08 отсюда убрали нерабочую кнопку «RU»:
                мёртвый элемент в шапке читается как недоделка. */}
            <LocaleSwitcher />
          </div>
        </div>
      </div>

      {/*
        Мобильная шапка. Была из логотипа и колокольчика: ни поиска,
        ни корзины — искать товар с телефона можно было, только дойдя
        до каталога, а корзина жила исключительно в таб-баре.
      */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4">
          <Logo compact />
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell unreadCount={unreadCount} />
            <Link
              to="/cart"
              aria-label={
                cartCount > 0
                  ? t("Корзина, {count}", {
                      count: plural(cartCount, t("позиция"), t("позиции"), t("позиций")),
                    })
                  : t("Корзина")
              }
              className="relative grid h-11 w-11 place-items-center rounded-full text-muted-foreground"
            >
              <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
              {cartCount > 0 ? (
                <span
                  className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white"
                  aria-hidden
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
        <form
          onSubmit={onHeaderSearch}
          role="search"
          className="flex items-center gap-2 px-4 pb-3"
        >
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 focus-within:border-primary/60">
            <Search
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              value={headerQuery}
              onChange={(event) => setHeaderQuery(event.target.value)}
              aria-label={t("Поиск по каталогу")}
              placeholder={t("Поиск по каталогу")}
              // type="search" даёт на телефоне крестик очистки и кнопку
              // «Найти» вместо «Enter» на клавиатуре.
              type="search"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
      </header>

      <header className="sticky top-0 z-50 hidden border-b border-border/80 bg-card/90 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-[82px] max-w-[1320px] items-center gap-4 px-4 xl:gap-8 xl:px-6">
          <Logo />

          <nav
            aria-label={t("Основная навигация")}
            className="flex items-center gap-4 text-sm font-medium xl:gap-7"
          >
            <Link
              to="/"
              className={
                path === "/"
                  ? "text-primary"
                  : "text-foreground/75 hover:text-primary"
              }
            >
              {t("Главная")}
            </Link>
            <CatalogMegaMenu
              categories={categoryTree}
              isLoading={categoriesQuery.isLoading}
            />
            <Link
              to="/about"
              className={
                path.startsWith("/about")
                  ? "text-primary"
                  : "text-foreground/75 hover:text-primary"
              }
            >
              {t("О компании")}
            </Link>
            <Link
              to="/service"
              className={
                path.startsWith("/service")
                  ? "text-primary"
                  : "text-foreground/75 hover:text-primary"
              }
            >
              {t("Сервис")}
            </Link>
          </nav>

          <form
            onSubmit={onHeaderSearch}
            className="ml-auto flex h-11 max-w-[200px] min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 transition-colors focus-within:border-primary/60 xl:max-w-[280px]"
            role="search"
          >
            <button type="submit" aria-label={t("Найти в каталоге")}>
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            </button>
            <input
              value={headerQuery}
              onChange={(event) => setHeaderQuery(event.target.value)}
              aria-label={t("Поиск по каталогу")}
              placeholder={t("Поиск по каталогу")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>

          <NotificationsBell
            unreadCount={unreadCount}
            className="hidden lg:grid"
          />

          <Link
            to="/cart"
            aria-label={
              cartCount > 0 ? t("Корзина, {count} поз.", { count: cartCount }) : t("Корзина")
            }
            className="relative inline-flex h-11 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary xl:px-4"
          >
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
            <span className="hidden xl:inline">{t("Корзина")}</span>
            {cartCount > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>

          <Link
            to={profileTo}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {authenticated ? (
              <User className="h-[18px] w-[18px]" />
            ) : (
              <LogIn className="h-[18px] w-[18px]" />
            )}
            {profileLabel}
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "mx-auto min-h-[70dvh] w-full max-w-full px-5 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-8",
          CONTENT_WIDTH[width ?? (accountPage ? "account" : "storefront")],
        )}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-card pb-20 lg:pb-0">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm lg:px-6">
          <Logo compact />
          {/*
           * Ссылки подвала набраны 14px и занимали 20px по высоте — вдвое
           * меньше минимальных 44px, а пальцем попадать в них надо через
           * весь список. min-h-11 поднимает зону нажатия до нормы; строчный
           * зазор убран, потому что теперь высоту держат сами ссылки.
           */}
          <nav
            aria-label={t("Ссылки в подвале")}
            className="flex flex-wrap gap-x-4 text-muted-foreground"
          >
            <Link
              to="/about"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground"
            >
              {t("О компании")}
            </Link>
            <Link
              to="/promotions"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground"
            >
              {t("Акции")}
            </Link>
            <Link
              to="/contacts"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground"
            >
              {t("Контакты")}
            </Link>
            <Link
              to="/service"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground"
            >
              {t("Сервис")}
            </Link>
            <Link
              to="/legal/privacy"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground"
            >
              {t("Политика конфиденциальности")}
            </Link>
            <Link
              to="/legal/terms"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-foreground"
            >
              {t("Условия пользования")}
            </Link>
          </nav>
        </div>
      </footer>

      <nav
        ref={bottomNavRef}
        aria-label={t("Мобильная навигация")}
        className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-border bg-card/95 backdrop-blur lg:hidden"
        style={{
          boxShadow: "var(--shadow-nav)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <ul className="mx-auto grid max-w-[520px] grid-cols-5 px-2 pt-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.match(path);
            const profileTab = tab.to === "/profile";
            const href = profileTab ? profileTo : tab.to;
            const badge = tab.to === "/cart" && cartCount > 0;
            const label = profileTab && !authenticated ? t("Вход") : t(tab.labelKey);

            return (
              <li key={tab.to}>
                <Link
                  to={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    badge ? `${label}, ${cartCount} в корзине` : label
                  }
                  className="flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors active:bg-secondary"
                >
                  <span
                    className={cn(
                      "relative inline-flex h-8 w-12 items-center justify-center rounded-full transition-all",
                      active && "tab-pill",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      strokeWidth={active ? 2.4 : 1.8}
                      aria-hidden
                    />
                    {badge ? (
                      <span
                        className="absolute -top-0.5 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white"
                        aria-hidden
                      >
                        {cartCount}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
