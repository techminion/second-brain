import type { LucideIcon } from "lucide-react";
import { FileText, Link2, Search } from "lucide-react";
import type { ReactNode } from "react";

interface TeachingStep {
  Icon: LucideIcon;
  title: string;
  description: ReactNode;
}

// FR-AUTH-5 / 10_DESIGN §4: a brand-new graph teaches the three core moves —
// create a note, link with `[[`, and open the command palette — rather than a
// separate tutorial. The hints double as shortcut discovery.
const steps: TeachingStep[] = [
  {
    Icon: FileText,
    title: "Create your first note",
    description: (
      <>
        Press <kbd className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">⌘N</kbd> to start
        writing in markdown.
      </>
    ),
  },
  {
    Icon: Link2,
    title: "Link ideas together",
    description: (
      <>
        Type <kbd className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">[[</kbd> inside a
        note to connect it to another.
      </>
    ),
  },
  {
    Icon: Search,
    title: "Find anything",
    description: (
      <>
        Open the command palette with{" "}
        <kbd className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> to search and
        navigate.
      </>
    ),
  },
];

export function KnowledgeGraphEmptyState() {
  return (
    <section
      aria-labelledby="empty-state-heading"
      className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-8 px-6 py-16 text-center"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold" id="empty-state-heading">
          Your knowledge graph is empty
        </h1>
        <p className="text-muted-foreground text-sm">
          Everything you capture lives here. Here is how to begin.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-4 text-left">
        {steps.map(({ Icon, title, description }) => (
          <li className="flex items-start gap-3" key={title}>
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{title}</span>
              <span className="text-muted-foreground text-sm">{description}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
