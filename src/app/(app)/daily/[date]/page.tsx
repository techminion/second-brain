import { notFound, redirect } from "next/navigation";

import { resolveSessionUserId } from "@/features/auth/resolve-user-id";
import { createNoteService } from "@/features/notes/note-service";
import { ValidationError } from "@/shared/lib/errors";

interface DailyNotePageProps {
  params: Promise<{ date: string }>;
}

/**
 * Opens the daily note for `date` (FR-DAILY-1/2): get-or-create (or restore)
 * through NoteService, then hand off to the ordinary note page — daily notes
 * are plain notes (FR-DAILY-3). Idempotent, so a prefetch is harmless.
 */
export default async function DailyNotePage({ params }: DailyNotePageProps) {
  const { date } = await params;
  const userId = await resolveSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  let noteId: string;

  try {
    const service = await createNoteService();
    noteId = (await service.getOrCreateDailyNote(userId, date)).id;
  } catch (error) {
    if (error instanceof ValidationError) {
      notFound();
    }

    throw error;
  }

  redirect(`/notes/${noteId}`);
}
