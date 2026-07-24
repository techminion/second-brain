import { resolveSessionUserId } from "@/features/auth/resolve-user-id";
import { createNoteService, type NoteService } from "@/features/notes/note-service";
import { serviceErrorResponse, unauthenticatedResponse } from "@/shared/lib/api-error-response";
import { withRequestLogging } from "@/shared/lib/request-logging";

interface NoteRouteContext {
  request: Request;
  service: NoteService;
  userId: string;
}

type NoteRouteHandler = (context: NoteRouteContext) => Promise<Response>;

/**
 * Shared boundary for the note Web API: wraps a handler with the OBS-02 request
 * logging, resolves and requires the session user (401 otherwise), builds the
 * `NoteService`, and translates any thrown `ServiceError` into its 05_API §3
 * HTTP status. Handlers stay to parse → call service → shape response.
 */
export function noteRoute(
  routeName: string,
  handler: NoteRouteHandler,
): (request: Request) => Promise<Response> {
  return withRequestLogging(
    routeName,
    async (request) => {
      const userId = await resolveSessionUserId();

      if (!userId) {
        return unauthenticatedResponse();
      }

      try {
        const service = await createNoteService();
        return await handler({ request, service, userId });
      } catch (error) {
        return serviceErrorResponse(error);
      }
    },
    resolveSessionUserId,
  );
}
