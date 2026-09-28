import { resolveSessionUserId } from "@/features/auth/resolve-user-id";
import { createNoteService, type NoteService } from "@/features/notes/note-service";
import { createServiceRoute } from "@/shared/lib/service-route";

/**
 * Shared boundary for the note Web API (logging, require-session, service
 * construction, ServiceError → HTTP — see `createServiceRoute`).
 */
export const noteRoute = createServiceRoute<NoteService>(
  () => createNoteService(),
  () => resolveSessionUserId(),
);
