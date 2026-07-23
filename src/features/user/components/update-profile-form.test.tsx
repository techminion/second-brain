import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateProfileAction } from "../update-profile-action";
import { UpdateProfileForm } from "./update-profile-form";

vi.mock("../update-profile-action");

function submit(): void {
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
}

describe("UpdateProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a display name input with current value", () => {
    render(<UpdateProfileForm initialDisplayName="Alice" />);

    expect(screen.getByLabelText("Display name")).toHaveValue("Alice");
  });

  it("renders an empty input when display name is null", () => {
    render(<UpdateProfileForm initialDisplayName={null} />);

    expect(screen.getByLabelText("Display name")).toHaveValue("");
  });

  it("calls updateProfileAction with the entered display name", async () => {
    vi.mocked(updateProfileAction).mockResolvedValue({
      ok: true,
      profile: {
        id: "uid",
        email: "a@b.com",
        displayName: "Bob",
        createdAt: "2024-01-01T00:00:00Z",
      },
    });
    render(<UpdateProfileForm initialDisplayName={null} />);

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Bob" } });
    submit();

    await waitFor(() => {
      expect(updateProfileAction).toHaveBeenCalledWith({ displayName: "Bob" });
    });
  });

  it("disables the button while submitting", async () => {
    let resolve: (v: Awaited<ReturnType<typeof updateProfileAction>>) => void = () => {};
    vi.mocked(updateProfileAction).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<UpdateProfileForm initialDisplayName={null} />);

    submit();

    const pending = await screen.findByRole("button", { name: "Saving…" });
    expect(pending).toBeDisabled();

    resolve({
      ok: true,
      profile: { id: "uid", email: "a@b.com", displayName: null, createdAt: "" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled();
    });
  });

  it("announces a server error and does not clear the field", async () => {
    vi.mocked(updateProfileAction).mockResolvedValue({
      ok: false,
      message: "Display name must be 80 characters or fewer",
    });
    render(<UpdateProfileForm initialDisplayName={null} />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "x".repeat(90) },
    });
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Display name must be 80 characters or fewer",
    );
  });
});
