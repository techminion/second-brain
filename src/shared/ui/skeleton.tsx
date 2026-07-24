import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

// Loading states are skeletons that match the final layout, never spinners
// (10_DESIGN §2.3/§4). Consumers size a Skeleton to the element it stands in
// for, preventing the layout shift a spinner would cause. The pulse is
// suppressed under prefers-reduced-motion. Skeletons are decorative: the
// surrounding container owns the announced busy state (aria-busy / aria-live),
// so the blocks themselves stay out of the accessibility tree.
function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-md motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of placeholder lines. Defaults to 3. */
  lines?: number;
}

// A multi-line text placeholder — the last line is shortened so the block
// reads as a paragraph rather than a rectangle.
function SkeletonText({ className, lines = 3, ...props }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton className={cn("h-4", index === lines - 1 && lines > 1 && "w-2/3")} key={index} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText };
