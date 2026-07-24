import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton, SkeletonText } from "./skeleton";

describe("Skeleton", () => {
  it("renders a pulsing placeholder that is hidden from assistive tech", () => {
    const { container } = render(<Skeleton />);
    const block = container.firstElementChild;

    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("animate-pulse");
  });

  it("suppresses the pulse under reduced-motion", () => {
    const { container } = render(<Skeleton />);

    expect(container.firstElementChild).toHaveClass("motion-reduce:animate-none");
  });

  it("merges caller sizing classes", () => {
    const { container } = render(<Skeleton className="h-8 w-24" />);

    expect(container.firstElementChild).toHaveClass("h-8", "w-24");
  });
});

describe("SkeletonText", () => {
  it("renders the requested number of lines", () => {
    const { container } = render(<SkeletonText lines={4} />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(4);
  });

  it("defaults to three lines", () => {
    const { container } = render(<SkeletonText />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(3);
  });

  it("shortens the final line of a multi-line block", () => {
    const { container } = render(<SkeletonText lines={2} />);
    const lines = container.querySelectorAll("[aria-hidden='true']");

    expect(lines[0]).not.toHaveClass("w-2/3");
    expect(lines[1]).toHaveClass("w-2/3");
  });

  it("does not shorten a single-line block", () => {
    const { container } = render(<SkeletonText lines={1} />);

    expect(container.querySelector("[aria-hidden='true']")).not.toHaveClass("w-2/3");
  });
});
