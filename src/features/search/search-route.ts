import { resolveSessionUserId } from "@/features/auth/resolve-user-id";
import { createSearchService, type SearchService } from "@/features/search/search-service";
import { createServiceRoute } from "@/shared/lib/service-route";

/** Shared boundary for the search Web API (see `createServiceRoute`). */
export const searchRoute = createServiceRoute<SearchService>(
  () => createSearchService(),
  () => resolveSessionUserId(),
);
