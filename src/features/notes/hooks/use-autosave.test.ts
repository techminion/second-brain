import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutosave } from "./use-autosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave", () => {
  it("saves once after the debounce window elapses", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useAutosave(save, 800));

    act(() => result.current.schedule());
    expect(save).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(800));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("debounces rapid edits into a single save", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useAutosave(save, 800));

    act(() => {
      result.current.schedule();
      vi.advanceTimersByTime(500);
      result.current.schedule();
      vi.advanceTimersByTime(500);
      result.current.schedule();
    });
    expect(save).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(800));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush saves immediately and cancels the pending timer", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useAutosave(save, 800));

    act(() => result.current.schedule());
    act(() => result.current.flush());
    expect(save).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(800));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush does nothing when no save is pending", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useAutosave(save, 800));

    act(() => result.current.flush());
    expect(save).not.toHaveBeenCalled();
  });

  it("flushes a pending save on unmount", () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useAutosave(save, 800));

    act(() => result.current.schedule());
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not save on unmount when nothing is pending", () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useAutosave(save, 800));

    act(() => result.current.schedule());
    act(() => vi.advanceTimersByTime(800));
    save.mockClear();

    unmount();
    expect(save).not.toHaveBeenCalled();
  });
});
