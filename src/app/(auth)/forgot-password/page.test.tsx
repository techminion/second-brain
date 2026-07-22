import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ForgotPasswordPage from "./page";

vi.mock("@/features/auth/components/password-reset-request-form", () => ({
  PasswordResetRequestForm: () => <form aria-label="Password reset request" />,
}));

describe("ForgotPasswordPage", () => {
  it("renders the request page and login link", async () => {
    render(await ForgotPasswordPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Password reset request" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("announces an invalid or expired link", async () => {
    render(await ForgotPasswordPage({ searchParams: Promise.resolve({ error: "invalid-link" }) }));

    expect(screen.getByRole("alert")).toHaveTextContent("invalid or has expired");
  });
});
