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

type Tab = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  match: (p: string) => boolean;
};

const mobileTabs: Tab[] = [
  {
    to: "/catalog",
    label: "Каталог",
    icon: LayoutGrid,
    match: (p) => p.startsWith("/catalog") || p.startsWith("/product"),
  },
  {
    to: "/cart",
    label: "Корзина",
    icon: ShoppingCart,
    match: (p) => p.startsWith("/cart"),
  },
  {
    to: "/orders",
    label: "Заказы",
    icon: Package,
    match: (p) => p.startsWith("/orders") || p.startsWith("/requests"),
  },
  // Сервис — раздел ТЗ наравне с каталогом, но с телефона он был достижим
  // только через подвал, а подвал прячется под таб-баром.
  {
    to: "/service",
    label: "Сервис",
    icon: Wrench,
    match: (p) => p.startsWith("/service"),
  },
  {
    to: "/profile",
    label: "Профиль",
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
  return (
    <Link
      to="/"
      className="inline-flex shrink-0 items-center gap-3"
      aria-label="Medix — на главную"
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

function CatalogMegaMenu({
  categories,
  isLoading,
}: {
  categories: CatalogCategoryNode[];
  isLoading: boolean;
}) {
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
          Каталог
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="catalog-mega-menu"
          aria-label={open ? "Скрыть категории" : "Показать категории"}
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
        aria-label="Каталог — категории"
        hidden={!open}
        className="absolute top-full left-1/2 z-50 w-[min(900px,calc(100vw-2rem))] max-w-[900px] -translate-x-1/2 pt-[19px] xl:left-[-175px] xl:w-[900px] xl:translate-x-0"
      >
        <div className="grid overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_26px_70px_-28px_rgba(15,51,80,.45)] lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr]">
          <div className="border-r border-border bg-background/70 p-3">
            <div className="px-3 pt-1 pb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              Категории
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
                Категории скоро появятся
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
              Весь каталог <ArrowRight className="h-3.5 w-3.5" />
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
                            "подкатегория",
                            "подкатегории",
                            "подкатегорий",
                          )
                        : "Раздел"}
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
                    Открыть раздел <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {menuCategory.children.length > 0 ? (
                    menuCategory.children.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to="/catalog/$categoryId"
                        params={{
                          categoryId: menuCategory.slug || menuCategory.id,
                        }}
                        search={{
                          subcategory: subcategory.slug || subcategory.id,
                          q: undefined,
                        }}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] transition hover:border-border hover:bg-background"
                      >
                        <span className="group-hover:text-primary">
                          {subcategory.name}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="col-span-2 text-sm text-muted-foreground">
                      Подкатегории не добавлены
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Выберите категорию слева
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
  return (
    <Link
      to="/notifications"
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-primary",
        className,
      )}
      aria-label={
        unreadCount > 0
          ? `Уведомления, непрочитанных ${unreadCount}`
          : "Уведомления"
      }
      title="Уведомления"
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
  const profileLabel = authenticated ? "Кабинет" : "Войти";

  function onHeaderSearch(event: React.FormEvent) {
    event.preventDefault();
    void navigate({
      to: "/catalog",
      search: { q: headerQuery.trim() || undefined, category: undefined },
    });
  }

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Перейти к содержимому
      </a>

      <div className="hidden border-b border-border/70 bg-card text-[12px] text-muted-foreground lg:block">
        <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Бишкек, Кыргызстан
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
              Сервис и ремонт
            </Link>
            <Link
              to="/contacts"
              className="transition-colors hover:text-primary"
            >
              Контакты
            </Link>
            {/* Переключатель языка убран: кнопка ничего не делала, а второй
                локали в проекте нет (ТЗ — только русский). Мёртвый элемент
                в шапке читается как недоделка. */}
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
                  ? `Корзина, ${plural(cartCount, "позиция", "позиции", "позиций")}`
                  : "Корзина"
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
              aria-label="Поиск по каталогу"
              placeholder="Поиск по каталогу"
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
            aria-label="Основная навигация"
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
              Главная
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
              О компании
            </Link>
            <Link
              to="/service"
              className={
                path.startsWith("/service")
                  ? "text-primary"
                  : "text-foreground/75 hover:text-primary"
              }
            >
              Сервис
            </Link>
          </nav>

          <form
            onSubmit={onHeaderSearch}
            className="ml-auto flex h-11 max-w-[200px] min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 transition-colors focus-within:border-primary/60 xl:max-w-[280px]"
            role="search"
          >
            <button type="submit" aria-label="Найти в каталоге">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            </button>
            <input
              value={headerQuery}
              onChange={(event) => setHeaderQuery(event.target.value)}
              aria-label="Поиск по каталогу"
              placeholder="Поиск по каталогу"
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
              cartCount > 0 ? `Корзина, ${cartCount} поз.` : "Корзина"
            }
            className="relative inline-flex h-11 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary xl:px-4"
          >
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
            <span className="hidden xl:inline">Корзина</span>
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
          "mx-auto min-h-[70vh] w-full max-w-full px-5 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-8",
          CONTENT_WIDTH[width ?? (accountPage ? "account" : "storefront")],
        )}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-card pb-20 lg:pb-0">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm lg:px-6">
          <Logo compact />
          <nav
            aria-label="Ссылки в подвале"
            className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground"
          >
            <Link to="/about" className="hover:text-foreground">
              О компании
            </Link>
            <Link to="/promotions" className="hover:text-foreground">
              Акции
            </Link>
            <Link to="/contacts" className="hover:text-foreground">
              Контакты
            </Link>
            <Link to="/service" className="hover:text-foreground">
              Сервис
            </Link>
            <Link
              to="/pages/$slug"
              params={{ slug: "privacy" }}
              className="hover:text-foreground"
            >
              Политика
            </Link>
          </nav>
        </div>
      </footer>

      <nav
        aria-label="Мобильная навигация"
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
            const label = profileTab && !authenticated ? "Вход" : tab.label;

            return (
              <li key={tab.to}>
                <Link
                  to={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    badge ? `${label}, ${cartCount} в корзине` : label
                  }
                  className="flex flex-col items-center gap-1 rounded-xl py-1.5"
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
