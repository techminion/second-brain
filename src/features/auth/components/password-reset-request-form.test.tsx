import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestPasswordReset } from "../password-reset-request";
import { PasswordResetRequestForm } from "./password-reset-request-form";

vi.mock("../password-reset-request");

function submit(email: string): void {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

describe("PasswordResetRequestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a labeled email field", () => {
    render(<PasswordResetRequestForm />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
  });

  it("validates the email before calling the action", async () => {
    render(<PasswordResetRequestForm />);
    submit("not-an-email");

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("announces the neutral success message", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message: "If an account exists for that email, we sent a link to reset its password.",
      ok: true,
    });
    render(<PasswordResetRequestForm />);
    submit("person@example.com");

    expect(await screen.findByRole("status")).toHaveTextContent("If an account exists");
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: "person@example.com" });
  });

  it("disables submission while the request is pending", async () => {
    let resolveRequest: (
      value: Awaited<ReturnType<typeof requestPasswordReset>>,
    ) => void = () => {};
    vi.mocked(requestPasswordReset).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    render(<PasswordResetRequestForm />);
    submit("person@example.com");

    expect(await screen.findByRole("button", { name: "Sending reset link…" })).toBeDisabled();

    resolveRequest({ message: "Sent", ok: true });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Sent"));
  });
});
