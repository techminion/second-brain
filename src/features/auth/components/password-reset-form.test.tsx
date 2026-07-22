import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetPassword } from "../password-reset";
import { PasswordResetForm } from "./password-reset-form";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("../password-reset");

function fillAndSubmit(password: string, confirmPassword: string): void {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirmPassword },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
}

describe("PasswordResetForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders new-password autocomplete fields", () => {
    render(<PasswordResetForm />);

    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("blocks mismatched passwords", async () => {
    render(<PasswordResetForm />);
    fillAndSubmit("new-secure-password", "different-password");

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("updates the password and enters the app", async () => {
    vi.mocked(resetPassword).mockResolvedValue({ ok: true });
    render(<PasswordResetForm />);
    fillAndSubmit("new-secure-password", "new-secure-password");

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(resetPassword).toHaveBeenCalledWith({
      confirmPassword: "new-secure-password",
      password: "new-secure-password",
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("announces an action failure", async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      message: "Request a new password reset link and try again.",
      ok: false,
      reason: "invalid-session",
    });
    render(<PasswordResetForm />);
    fillAndSubmit("new-secure-password", "new-secure-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Request a new password reset link");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
