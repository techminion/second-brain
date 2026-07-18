import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInWithPassword } from "../sign-in";
import { SignInForm } from "./sign-in-form";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("../sign-in");

function fillAndSubmit(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders labeled email and password fields", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("shows validation errors and does not call Supabase on invalid input", async () => {
    render(<SignInForm />);

    fillAndSubmit("not-an-email", "");

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("submits valid credentials and redirects into the app", async () => {
    vi.mocked(signInWithPassword).mockResolvedValue({ ok: true });
    render(<SignInForm />);

    fillAndSubmit("person@example.com", "long-enough-password");

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "long-enough-password",
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("announces a credential failure and stays on the page", async () => {
    vi.mocked(signInWithPassword).mockResolvedValue({
      message: "Incorrect email or password.",
      ok: false,
      reason: "invalid-credentials",
    });
    render(<SignInForm />);

    fillAndSubmit("person@example.com", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveSignIn: (value: Awaited<ReturnType<typeof signInWithPassword>>) => void = () => {};
    vi.mocked(signInWithPassword).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    render(<SignInForm />);

    fillAndSubmit("person@example.com", "long-enough-password");

    const pendingButton = await screen.findByRole("button", { name: "Logging in…" });
    expect(pendingButton).toBeDisabled();

    resolveSignIn({ ok: true });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
  });
});
