import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QueryProvider } from "./query-provider";

function TestComponent() {
  const queryClient = useQueryClient();
  const defaults = queryClient.getDefaultOptions().queries;
  return (
    <div>
      <span data-testid="stale-time">{String(defaults?.staleTime)}</span>
      <span data-testid="refetch-focus">{String(defaults?.refetchOnWindowFocus)}</span>
      <span data-testid="retry">{String(defaults?.retry)}</span>
    </div>
  );
}

describe("QueryProvider", () => {
  it("provides configured defaults to query client", () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>,
    );

    expect(screen.getByTestId("stale-time").textContent).toBe("60000");
    expect(screen.getByTestId("refetch-focus").textContent).toBe("false");
    expect(screen.getByTestId("retry").textContent).toBe("1");
  });
});
