import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { createAppQueryClient } from "@/app/query-client";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { bootstrapSession } from "@/session/store";

const queryClient = createAppQueryClient();

export function getAppQueryClient() {
  return queryClient;
}

/**
 * QueryClient + session bootstrap. Session↔API binding runs at store module load.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  // LocaleProvider внутри QueryClientProvider: при смене языка он сбрасывает
  // кэш запросов, а значит должен видеть клиента.
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientProvider>
  );
}
