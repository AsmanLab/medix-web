import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { createAppQueryClient } from "@/app/query-client";
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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
