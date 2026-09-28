import { resolveSessionUserId } from "@/features/auth/resolve-user-id";
import { createFolderService, type FolderService } from "@/features/folders/folder-service";
import { createServiceRoute } from "@/shared/lib/service-route";

/** Shared boundary for the folder Web API (see `createServiceRoute`). */
export const folderRoute = createServiceRoute<FolderService>(
  () => createFolderService(),
  () => resolveSessionUserId(),
);
