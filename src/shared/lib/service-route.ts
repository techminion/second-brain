import { serviceErrorResponse, unauthenticatedResponse } from "@/shared/lib/api-error-response";
import type { StructuredLogger } from "@/shared/lib/logger";
import { withRequestLogging } from "@/shared/lib/request-logging";

export interface ServiceRouteContext<Service> {
  request: Request;
  service: Service;
  userId: string;
  /** The request's structured, content-free logger (OBS-01/02), for route-level metrics. */
  logger: StructuredLogger;
}

export type ServiceRouteHandler<Service> = (
  context: ServiceRouteContext<Service>,
) => Promise<Response>;

/**
 * Builds the shared Web API boundary for one service: OBS-02 request logging,
 * require-session (401 otherwise, before the service is built), and
 * ServiceError → 05_API §3 HTTP status translation. Handlers stay to
 * parse → call service → shape response. `resolveUserId` is injected because
 * session resolution lives in the auth feature.
 */
export function createServiceRoute<Service>(
  createService: () => Promise<Service>,
  resolveUserId: () => Promise<string | null>,
) {
  return function serviceRoute(
    routeName: string,
    handler: ServiceRouteHandler<Service>,
  ): (request: Request) => Promise<Response> {
    return withRequestLogging(
      routeName,
      async (request, { logger }) => {
        const userId = await resolveUserId();

        if (!userId) {
          return unauthenticatedResponse();
        }

        try {
          const service = await createService();
          return await handler({ logger, request, service, userId });
        } catch (error) {
          return serviceErrorResponse(error);
        }
      },
      resolveUserId,
    );
  };
}
