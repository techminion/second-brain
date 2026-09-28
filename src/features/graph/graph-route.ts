import { resolveSessionUserId } from "@/features/auth/resolve-user-id";
import { createGraphService, type GraphService } from "@/features/graph/graph-service";
import { createServiceRoute } from "@/shared/lib/service-route";

/** Shared boundary for the graph Web API (see `createServiceRoute`). */
export const graphRoute = createServiceRoute<GraphService>(
  () => createGraphService(),
  () => resolveSessionUserId(),
);
