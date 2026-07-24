"use client";

import { useCallback, useEffect, useRef } from "react";

export interface AutosaveController {
  /** (Re)arm the debounce timer after an edit. */
  schedule: () => void;
  /** Save immediately if a save is pending (blur / navigation). */
  flush: () => void;
}

/**
 * Debounced autosave per 10_DESIGN §5 / FR-NOTE-5: `schedule()` re-arms a
 * ~800ms timer after each edit, `flush()` saves immediately when something is
 * pending (save-on-blur), and unmount flushes so navigating away never drops
 * edits. `save` must not read React state directly (it may run during unmount);
 * pass the latest values through a ref.
 */
export function useAutosave(save: () => void, delayMs = 800): AutosaveController {
  const saveRef = useRef(save);
  saveRef.current = save;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(false);

  const run = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
    pending.current = false;
    saveRef.current();
  }, []);

  const schedule = useCallback(() => {
    pending.current = true;
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(run, delayMs);
  }, [delayMs, run]);

  const flush = useCallback(() => {
    if (pending.current) {
      run();
    }
  }, [run]);

  useEffect(
    () => () => {
      if (pending.current) {
        run();
      }
    },
    [run],
  );

  return { flush, schedule };
}
