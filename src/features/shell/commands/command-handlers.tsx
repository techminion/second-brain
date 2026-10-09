"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CommandAction } from "./command-registry";

type CommandHandler = () => void;

interface CommandHandlerRegistry {
  register: (action: CommandAction, handler: CommandHandler) => () => void;
  get: (action: CommandAction) => CommandHandler | undefined;
  has: (action: CommandAction) => boolean;
  /** Bumps on every (un)registration so consumers re-render. */
  version: number;
}

const CommandHandlersContext = createContext<CommandHandlerRegistry | null>(null);

/**
 * Feature-provided palette command handlers (UX-07). The shell owns the
 * command list but must not import features, so a feature registers the
 * behaviour for an action (e.g. the notes feature's "new-note") from a
 * component injected through the shell's `overlays` slot — the same
 * inversion as quick-open (SRCH-07).
 */
export function CommandHandlersProvider({ children }: Readonly<{ children: ReactNode }>) {
  const handlersRef = useRef(new Map<CommandAction, CommandHandler>());
  const [version, setVersion] = useState(0);

  const register = useCallback((action: CommandAction, handler: CommandHandler) => {
    handlersRef.current.set(action, handler);
    setVersion((v) => v + 1);
    return () => {
      if (handlersRef.current.get(action) === handler) {
        handlersRef.current.delete(action);
        setVersion((v) => v + 1);
      }
    };
  }, []);

  const get = useCallback((action: CommandAction) => handlersRef.current.get(action), []);
  const has = useCallback((action: CommandAction) => handlersRef.current.has(action), []);

  const value = useMemo(() => ({ get, has, register, version }), [get, has, register, version]);

  return (
    <CommandHandlersContext.Provider value={value}>{children}</CommandHandlersContext.Provider>
  );
}

function useRegistry(hookName: string): CommandHandlerRegistry {
  const registry = useContext(CommandHandlersContext);
  if (!registry) {
    throw new Error(`${hookName} requires a CommandHandlersProvider ancestor`);
  }
  return registry;
}

/** Register the handler for a palette command action while mounted. */
export function useRegisterCommandHandler(action: CommandAction, handler: CommandHandler): void {
  const { register } = useRegistry("useRegisterCommandHandler");
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => register(action, () => handlerRef.current()), [action, register]);
}

const emptyRegistry: Pick<CommandHandlerRegistry, "get" | "has" | "version"> = {
  get: () => undefined,
  has: () => false,
  version: 0,
};

/**
 * The registry, for the palette to look up and run handlers. Without a
 * provider no handlers exist, so feature commands simply render disabled.
 */
export function useCommandHandlers(): Pick<CommandHandlerRegistry, "get" | "has" | "version"> {
  return useContext(CommandHandlersContext) ?? emptyRegistry;
}

/** The current handler for one action, or undefined when none is registered. */
export function useCommandHandler(action: CommandAction): CommandHandler | undefined {
  const registry = useRegistry("useCommandHandler");
  return registry.get(action);
}
