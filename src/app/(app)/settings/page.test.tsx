import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SettingsPage from "./page";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));

vi.mock("@/shared/lib/supabase-server-action-client", () => ({
  createServerActionSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getClaims },
  }),
}));

vi.mock("@/features/user/user-service", () => ({
  createUserService: vi.fn().mockResolvedValue({
    getProfile: vi.fn().mockResolvedValue({
      id: "uid-1",
      email: "test@example.com",
      displayName: "Alice",
      createdAt: "2024-01-01T00:00:00Z",
    }),
  }),
}));

vi.mock("@/features/user/components/update-profile-form", () => ({
  UpdateProfileForm: ({ initialDisplayName }: { initialDisplayName: string | null }) => (
    <div data-testid="update-profile-form">{initialDisplayName}</div>
  ),
}));

describe("SettingsPage", () => {
  it("renders the page heading", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "uid-1" } }, error: null });

    render(await SettingsPage());

    expect(screen.getByRole("heading", { level: 1, name: "Account settings" })).toBeInTheDocument();
  });

  it("displays the user email as read-only", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "uid-1" } }, error: null });

    render(await SettingsPage());

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("passes the current display name to the form", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "uid-1" } }, error: null });

    render(await SettingsPage());

    expect(screen.getByTestId("update-profile-form")).toHaveTextContent("Alice");
  });

  it("renders nothing when the session has no user", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("no session") });

    const { container } = render(await SettingsPage());

    expect(container).toBeEmptyDOMElement();
  });
});
