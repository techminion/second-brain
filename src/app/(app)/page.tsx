import type { Metadata } from "next";

import { HomeDashboard } from "@/features/notes/components/home-dashboard";
import { NewNoteButton } from "@/features/notes/components/new-note-button";
import { KnowledgeGraphEmptyState } from "@/features/shell/components/knowledge-graph-empty-state";

export const metadata: Metadata = { title: "Home" };

// The app layer composes the shell's onboarding with the notes feature's
// New note action; features may not import each other's components.
export default function HomePage() {
  return (
    <HomeDashboard
      emptyState={
        <KnowledgeGraphEmptyState newNoteSlot={<NewNoteButton className="justify-start" />} />
      }
    />
  );
}
