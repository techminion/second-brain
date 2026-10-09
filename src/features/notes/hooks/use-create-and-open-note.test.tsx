import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCreateAndOpenNote } from "./use-create-and-open-note";

type Options = { onSettled?: () => void; onSuccess?: (n: { id: string }) => void };

const mutate = vi.fn<(input: unknown, options?: Options) => void>();
const push = vi.fn();
let isPending = false;

vi.mock("./use-note-mutations", () => ({
  useCreateNote: () => ({ isPending, mutate }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/** Settle every create a test left in flight, so the shared guard resets. */
function settleAll() {
  for (const [, options] of mutate.mock.calls) {
    act(() => options?.onSettled?.());
  }
}

afterEach(() => {
  settleAll();
  mutate.mockReset();
  push.mockReset();
  isPending = false;
});

describe("useCreateAndOpenNote", () => {
  it("creates an Untitled note and opens it", () => {
    mutate.mockImplementation((_input, options) => {
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
    // mutate does not settle, as with a slow request.
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => {
      result.current.createAndOpen();
      result.current.createAndOpen();
    });

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("shares the in-flight guard across callers (shortcut + click)", () => {
    // Two independent hook instances, like the shortcut and the sidebar button.
    const shortcut = renderHook(() => useCreateAndOpenNote());
    const button = renderHook(() => useCreateAndOpenNote());

    act(() => shortcut.result.current.createAndOpen());
    act(() => button.result.current.createAndOpen());

    expect(mutate).toHaveBeenCalledTimes(1);

    // Once the first create settles, any caller can create again.
    settleAll();
    act(() => button.result.current.createAndOpen());

    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("allows a new create once the previous one settles", () => {
    mutate.mockImplementation((_input, options) => options?.onSettled?.());
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => result.current.createAndOpen());
    act(() => result.current.createAndOpen());

    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("releases the guard if mutate throws synchronously", () => {
    mutate.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useCreateAndOpenNote());

    expect(() => act(() => result.current.createAndOpen())).toThrow("boom");
    mutate.mockImplementation((_input, options) => options?.onSettled?.());
    act(() => result.current.createAndOpen());

    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
