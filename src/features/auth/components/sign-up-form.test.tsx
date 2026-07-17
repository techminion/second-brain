import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signUpWithPassword } from "../sign-up";
import { SignUpForm } from "./sign-up-form";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("../sign-up");

function fillAndSubmit(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders labeled email and password fields", () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("shows validation errors and does not call Supabase on invalid input", async () => {
    render(<SignUpForm />);

    fillAndSubmit("not-an-email", "1234567");

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it("links each error message to its field for assistive tech", async () => {
    render(<SignUpForm />);

    fillAndSubmit("not-an-email", "1234567");
    await screen.findByText("Enter a valid email address.");

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("submits valid input and redirects into the app", async () => {
    vi.mocked(signUpWithPassword).mockResolvedValue({ ok: true });
    render(<SignUpForm />);

    fillAndSubmit("person@example.com", "long-enough-password");

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(signUpWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "long-enough-password",
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("announces a submit failure and stays on the page", async () => {
    vi.mocked(signUpWithPassword).mockResolvedValue({
      message: "An account with this email already exists.",
      ok: false,
      reason: "email-taken",
    });
    render(<SignUpForm />);

    fillAndSubmit("person@example.com", "long-enough-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveSignUp: (value: Awaited<ReturnType<typeof signUpWithPassword>>) => void = () => {};
    vi.mocked(signUpWithPassword).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignUp = resolve;
        }),
    );
    render(<SignUpForm />);

    fillAndSubmit("person@example.com", "long-enough-password");

    const pendingButton = await screen.findByRole("button", { name: "Creating account…" });
    expect(pendingButton).toBeDisabled();

    resolveSignUp({ ok: true });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
  });
});
