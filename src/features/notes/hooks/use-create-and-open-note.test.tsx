import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCreateAndOpenNote } from "./use-create-and-open-note";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

const mutateAsync = vi.fn<(input: unknown) => Promise<{ id: string }>>();
const push = vi.fn();
let isPending = false;

vi.mock("./use-note-mutations", () => ({
  useCreateNote: () => ({ isPending, mutateAsync }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

interface Deferred {
  promise: Promise<{ id: string }>;
  resolve: (note: { id: string }) => void;
  reject: (error: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: Deferred["resolve"];
  let reject!: Deferred["reject"];
  const promise = new Promise<{ id: string }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

let inFlight: Deferred[] = [];

beforeEach(() => {
  inFlight = [];
  mutateAsync.mockImplementation(() => {
    const d = deferred();
    inFlight.push(d);
    return d.promise;
  });
});

/** Settle every create a test left in flight, so the shared guard resets. */
afterEach(async () => {
  await act(async () => {
    inFlight.forEach((d) => d.resolve({ id: "cleanup" }));
    await Promise.resolve();
  });
  mutateAsync.mockReset();
  push.mockReset();
  toastError.mockReset();
  isPending = false;
});

async function settle(action: () => void) {
  await act(async () => {
    action();
    // Let the then/catch/finally chain run.
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("useCreateAndOpenNote", () => {
  it("creates an Untitled note and opens it", async () => {
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => result.current.createAndOpen());
    await settle(() => inFlight[0].resolve({ id: "new-id" }));

    expect(mutateAsync).toHaveBeenCalledWith({ title: "Untitled" });
    expect(push).toHaveBeenCalledWith("/notes/new-id");
  });

  it("is a no-op while a create is pending", () => {
    isPending = true;
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => result.current.createAndOpen());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
  });

  it("ignores repeat calls before the pending state re-renders", () => {
    const { result } = renderHook(() => useCreateAndOpenNote());

    act(() => {
      result.current.createAndOpen();
      result.current.createAndOpen();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("shares the in-flight guard across callers (shortcut + click)", async () => {
    const shortcut = renderHook(() => useCreateAndOpenNote());
    const button = renderHook(() => useCreateAndOpenNote());

    act(() => shortcut.result.current.createAndOpen());
    act(() => button.result.current.createAndOpen());
    expect(mutateAsync).toHaveBeenCalledTimes(1);

    await settle(() => inFlight[0].resolve({ id: "first" }));
    act(() => button.result.current.createAndOpen());

    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it("still opens the note when the caller unmounts mid-create, then lets others create", async () => {
    // Home's onboarding button unmounts as soon as the optimistic row lands.
    const onboarding = renderHook(() => useCreateAndOpenNote());
    act(() => onboarding.result.current.createAndOpen());
    onboarding.unmount();

    await settle(() => inFlight[0].resolve({ id: "from-onboarding" }));

    expect(push).toHaveBeenCalledWith("/notes/from-onboarding");

    const sidebar = renderHook(() => useCreateAndOpenNote());
    act(() => sidebar.result.current.createAndOpen());
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it("releases the guard and reports the error when an unmounted caller's create fails", async () => {
    const onboarding = renderHook(() => useCreateAndOpenNote());
    act(() => onboarding.result.current.createAndOpen());
    onboarding.unmount();

    await settle(() => inFlight[0].reject(new Error("network")));

    expect(push).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);

    const sidebar = renderHook(() => useCreateAndOpenNote());
    act(() => sidebar.result.current.createAndOpen());
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it("releases the guard if mutateAsync throws synchronously", () => {
    mutateAsync.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useCreateAndOpenNote());

    expect(() => act(() => result.current.createAndOpen())).toThrow("boom");
    act(() => result.current.createAndOpen());

    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });
});
