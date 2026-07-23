export const queryKeys = {
  catalog: {
    all: ["catalog"] as const,
    categories: () => [...queryKeys.catalog.all, "categories"] as const,
    adminCategories: () =>
      [...queryKeys.catalog.all, "admin-categories"] as const,
    products: (params?: Record<string, unknown>) =>
      [...queryKeys.catalog.all, "products", params ?? {}] as const,
    productsByCategories: (
      categoryIds: string[],
      params?: Record<string, unknown>,
    ) =>
      [
        ...queryKeys.catalog.all,
        "products-by-categories",
        [...categoryIds].sort(),
        params ?? {},
      ] as const,
    product: (slug: string) =>
      [...queryKeys.catalog.all, "product", slug] as const,
    adminProducts: (params?: Record<string, unknown>) =>
      [...queryKeys.catalog.all, "admin-products", params ?? {}] as const,
    adminProduct: (id: string) =>
      [...queryKeys.catalog.all, "admin-product", id] as const,
  },
  cms: {
    all: ["cms"] as const,
    banners: () => [...queryKeys.cms.all, "banners"] as const,
    bannerImages: (keys: string[]) =>
      [...queryKeys.cms.all, "banner-images", [...keys].sort()] as const,
    page: (slug: string) => [...queryKeys.cms.all, "page", slug] as const,
    promotions: () => [...queryKeys.cms.all, "promotions"] as const,
    promotion: (slug: string) =>
      [...queryKeys.cms.all, "promotion", slug] as const,
    promotionImages: (keys: string[]) =>
      [...queryKeys.cms.all, "promotion-images", [...keys].sort()] as const,
    contacts: () => [...queryKeys.cms.all, "contacts"] as const,
    adminPages: () => [...queryKeys.cms.all, "admin-pages"] as const,
    adminPage: (slug: string) =>
      [...queryKeys.cms.all, "admin-page", slug] as const,
    adminPromotions: () => [...queryKeys.cms.all, "admin-promotions"] as const,
    adminPromotion: (id: string) =>
      [...queryKeys.cms.all, "admin-promotion", id] as const,
    adminBanners: () => [...queryKeys.cms.all, "admin-banners"] as const,
  },
  rfq: {
    all: ["rfq"] as const,
    list: () => [...queryKeys.rfq.all, "list"] as const,
    detail: (id: string) => [...queryKeys.rfq.all, "detail", id] as const,
    invoice: (id: string) => [...queryKeys.rfq.all, "invoice", id] as const,
  },
  managerRfq: {
    all: ["manager-rfq"] as const,
    list: () => [...queryKeys.managerRfq.all, "list"] as const,
    detail: (id: string) => [...queryKeys.managerRfq.all, "detail", id] as const,
    invoice: (rfqId: string) =>
      [...queryKeys.managerRfq.all, "invoice", rfqId] as const,
  },
  profile: {
    all: ["profile"] as const,
    current: () => [...queryKeys.profile.all, "current"] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.orders.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.orders.all, "detail", id] as const,
    invoice: (id: string) => [...queryKeys.orders.all, "invoice", id] as const,
  },
  service: {
    all: ["service"] as const,
    list: () => [...queryKeys.service.all, "list"] as const,
    detail: (id: string) => [...queryKeys.service.all, "detail", id] as const,
    engineerQueue: () => [...queryKeys.service.all, "engineer-queue"] as const,
    managerList: () => [...queryKeys.service.all, "manager-list"] as const,
    engineers: () => [...queryKeys.service.all, "engineers"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => [...queryKeys.notifications.all, "list"] as const,
  },
  adminCustomers: {
    all: ["admin-customers"] as const,
    list: (status?: string | null) =>
      [...queryKeys.adminCustomers.all, "list", status ?? "all"] as const,
    audit: (customerId: string) =>
      [...queryKeys.adminCustomers.all, "audit", customerId] as const,
  },
} as const;
