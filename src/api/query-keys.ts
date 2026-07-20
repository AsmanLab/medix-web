export const queryKeys = {
  catalog: {
    all: ["catalog"] as const,
    categories: () => [...queryKeys.catalog.all, "categories"] as const,
    products: (params?: Record<string, unknown>) =>
      [...queryKeys.catalog.all, "products", params ?? {}] as const,
    product: (slug: string) =>
      [...queryKeys.catalog.all, "product", slug] as const,
  },
  profile: {
    all: ["profile"] as const,
    current: () => [...queryKeys.profile.all, "current"] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.orders.all, "list", params ?? {}] as const,
  },
} as const;
