import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrashView } from "./trash-view";

const useTrashList = vi.fn();
const restoreMutate = vi.fn();
const push = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("../hooks/use-trash-list", () => ({ useTrashList: () => useTrashList() }));
vi.mock("../hooks/use-note-mutations", () => ({
  useRestoreNote: () => ({ isPending: false, mutate: restoreMutate, variables: undefined }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

function page(items: { deletedAt: string; id: string; title: string }[]) {
  return { pageParams: [undefined], pages: [{ items }] };
}

afterEach(() => {
  useTrashList.mockReset();
  restoreMutate.mockReset();
  push.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("TrashView", () => {
  it("shows a skeleton while loading", () => {
    useTrashList.mockReturnValue({ isPending: true });

    const { container } = render(<TrashView />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("explains an empty trash", () => {
    useTrashList.mockReturnValue({ data: page([]), isPending: false });

    render(<TrashView />);

    expect(screen.getByText("Trash is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to notes" })).toHaveAttribute("href", "/");
  });

  it("reports a load failure as an alert", () => {
    useTrashList.mockReturnValue({ isError: true, isPending: false });

    render(<TrashView />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the trash");
  });

  it("lists deleted notes with time left and restores one by name", () => {
    useTrashList.mockReturnValue({
      data: page([
        { deletedAt: new Date().toISOString(), id: "n1", title: "Plans" },
        { deletedAt: new Date().toISOString(), id: "n2", title: "" },
      ]),
      isPending: false,
    });

    render(<TrashView />);

    const list = screen.getByRole("list", { name: "Deleted notes" });
    expect(list).toHaveTextContent("Plans");
    expect(list).toHaveTextContent("Untitled");
    expect(list).toHaveTextContent("Deletes in 30 days");

    fireEvent.click(screen.getByRole("button", { name: "Restore Plans" }));

    expect(restoreMutate).toHaveBeenCalledWith("n1", expect.any(Object));

    const [, callbacks] = restoreMutate.mock.calls[0] as [
      string,
      { onSuccess: (note: { id: string }) => void; onError: () => void },
    ];
    callbacks.onSuccess({ id: "n1" });
    expect(toastSuccess).toHaveBeenCalledWith("Restored “Plans”", expect.any(Object));

    const [, options] = toastSuccess.mock.calls[0] as [string, { action: { onClick: () => void } }];
    options.action.onClick();
    expect(push).toHaveBeenCalledWith("/notes/n1");

    callbacks.onError();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("Could not restore"));
  });

  it("loads the next page on demand", () => {
    const fetchNextPage = vi.fn();
    useTrashList.mockReturnValue({
      data: page([{ deletedAt: new Date().toISOString(), id: "n1", title: "A" }]),
      fetchNextPage,
      hasNextPage: true,
      isPending: false,
    });

    render(<TrashView />);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(fetchNextPage).toHaveBeenCalled();
  });
});
