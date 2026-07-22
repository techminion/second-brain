import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResetPasswordPage from "./page";

vi.mock("@/features/auth/components/password-reset-form", () => ({
  PasswordResetForm: () => <form aria-label="Choose new password" />,
}));

describe("ResetPasswordPage", () => {
  it("renders the completion page", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Choose new password" })).toBeInTheDocument();
  });
});
