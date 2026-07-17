"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

import { isProductionEnvironment } from "@/shared/lib/env";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider wraps the React application to provide TanStack Query
 * data-fetching state management and default configuration rules.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {!isProductionEnvironment && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
