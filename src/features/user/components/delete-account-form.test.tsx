import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAccountAction } from "../delete-account-action";
import { DeleteAccountForm } from "./delete-account-form";

vi.mock("../delete-account-action");

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
}

describe("DeleteAccountForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger button", () => {
    render(<DeleteAccountForm />);

    expect(screen.getByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });

  it("opens a confirmation dialog when the trigger is clicked", () => {
    render(<DeleteAccountForm />);

    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete your account?" })).toBeInTheDocument();
  });

  it("explains the 30-day grace period in the dialog", () => {
    render(<DeleteAccountForm />);

    openDialog();

    expect(screen.getByRole("dialog")).toHaveTextContent("30 days");
  });

  it("closes the dialog when Cancel is clicked", async () => {
    render(<DeleteAccountForm />);

    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("calls deleteAccountAction when the confirmation button is clicked", async () => {
    vi.mocked(deleteAccountAction).mockResolvedValue({ ok: false, message: "Not authenticated." });
    render(<DeleteAccountForm />);

    openDialog();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete account" }),
    );

    await waitFor(() => {
      expect(deleteAccountAction).toHaveBeenCalledOnce();
    });
  });

  it("announces a server error without closing the dialog", async () => {
    vi.mocked(deleteAccountAction).mockResolvedValue({
      ok: false,
      message: "Could not schedule account deletion. Please try again.",
    });
    render(<DeleteAccountForm />);

    openDialog();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not schedule account deletion",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables buttons while the deletion is in flight", async () => {
    let resolve: (v: Awaited<ReturnType<typeof deleteAccountAction>>) => void = () => {};
    vi.mocked(deleteAccountAction).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<DeleteAccountForm />);

    openDialog();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete account" }),
    );

    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();

    resolve({ ok: false, message: "err" });
    await waitFor(() => {
      expect(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Delete account" }),
      ).not.toBeDisabled();
    });
  });
});
