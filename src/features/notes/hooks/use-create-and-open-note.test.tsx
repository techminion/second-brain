import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCreateAndOpenNote } from "./use-create-and-open-note";

const mutate = vi.fn();
const push = vi.fn();
let isPending = false;

vi.mock("./use-note-mutations", () => ({
  useCreateNote: () => ({ isPending, mutate }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

type Options = { onSettled?: () => void; onSuccess?: (n: { id: string }) => void };

afterEach(() => {
  mutate.mockReset();
  push.mockReset();
  isPending = false;
});

describe("useCreateAndOpenNote", () => {
  it("creates an Untitled note and opens it", () => {
    mutate.mockImplementation((_input, options?: Options) => {
      options?.onSuccess?.({ id: "new-id" });
      options?.onSettled?.();
    });
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => result.current.createAndOpen());

    expect(mutate).toHaveBeenCalledWith({ title: "Untitled" }, expect.any(Object));
    expect(push).toHaveBeenCalledWith("/notes/new-id");
  });

  it("is a no-op while a create is pending", () => {
    isPending = true;
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => result.current.createAndOpen());

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
  });

  it("ignores repeat calls before the pending state re-renders", () => {
    // mutate never settles, as with a slow request.
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => {
      result.current.createAndOpen();
      result.current.createAndOpen();
    });

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("allows a new create once the previous one settles", () => {
    mutate.mockImplementation((_input, options?: Options) => options?.onSettled?.());
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => result.current.createAndOpen());
    act(() => result.current.createAndOpen());

    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
