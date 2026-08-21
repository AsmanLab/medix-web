import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { LocaleProvider } from "@/i18n/LocaleProvider";

/**
 * `render`, но с `LocaleProvider` вокруг компонента.
 *
 * Любой компонент, вызывающий `useT()`, падает под голым `render()` из
 * testing-library с «useLocale вызван вне LocaleProvider» — так же, как
 * упал бы в приложении без провайдера. `LocaleProvider` сам читает
 * `useQueryClient()` (сбрасывает кэш при смене языка), поэтому нужен
 * и `QueryClientProvider` — новый клиент на каждый вызов, чтобы кэш
 * одного теста не утекал в другой.
 *
 * Используйте вместо `render` из `@testing-library/react` в тестах любого
 * компонента, который (прямо или через дочерние) вызывает `useT`.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>{children}</LocaleProvider>
      </QueryClientProvider>
    ),
    ...options,
  });
}
