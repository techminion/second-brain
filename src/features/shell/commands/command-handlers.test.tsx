import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CommandHandlersProvider,
  useCommandHandler,
  useCommandHandlers,
  useRegisterCommandHandler,
} from "./command-handlers";

function Registrar({ handler }: Readonly<{ handler: () => void }>) {
  useRegisterCommandHandler("new-note", handler);
  return null;
}

function Consumer() {
  const handlers = useCommandHandlers();
  const handler = useCommandHandler("new-note");
  return (
    <button onClick={() => handler?.()} type="button">
      {handlers.has("new-note") ? "registered" : "none"}
    </button>
  );
}

function renderWith(handler?: () => void) {
  return render(
    <CommandHandlersProvider>
      {handler ? <Registrar handler={handler} /> : null}
      <Consumer />
    </CommandHandlersProvider>,
  );
}

describe("command handlers", () => {
  it("reports no handler until one is registered", () => {
    renderWith();

    expect(screen.getByRole("button")).toHaveTextContent("none");
  });

  it("registers a handler and runs it", () => {
    const handler = vi.fn();
    renderWith(handler);

    expect(screen.getByRole("button")).toHaveTextContent("registered");
    act(() => screen.getByRole("button").click());
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("unregisters on unmount", () => {
    const view = renderWith(vi.fn());

    view.rerender(
      <CommandHandlersProvider>
        <Consumer />
      </CommandHandlersProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("none");
  });

  it("uses the latest handler after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = renderWith(first);

    view.rerender(
      <CommandHandlersProvider>
        <Registrar handler={second} />
        <Consumer />
      </CommandHandlersProvider>,
    );
    act(() => screen.getByRole("button").click());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("treats a missing provider as no handlers for readers", () => {
    function Reader() {
      return <span>{useCommandHandlers().has("new-note") ? "yes" : "no"}</span>;
    }
    render(<Reader />);

    expect(screen.getByText("no")).toBeInTheDocument();
  });

  it("requires a provider to register", () => {
    expect(() => render(<Registrar handler={vi.fn()} />)).toThrow(
      "useRegisterCommandHandler requires a CommandHandlersProvider ancestor",
    );
  });
});
