import type { CreateFolderInput, FolderDeleteStrategy } from "@/features/folders/types";
import { ValidationError } from "@/shared/lib/errors";

// Boundary marshalling only — FolderService re-validates every field.

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

export async function parseCreateFolderBody(request: Request): Promise<CreateFolderInput> {
  const body = await readJsonObject(request);
  const input: CreateFolderInput = { name: body.name as string };

  if ("parentFolderId" in body) {
    input.parentFolderId = body.parentFolderId as string | null;
  }

  return input;
}

export interface UpdateFolderBody {
  name?: string;
  /** Present (including `null` = root) means "move"; absent means "leave". */
  parentFolderId?: string | null;
}

export async function parseUpdateFolderBody(request: Request): Promise<UpdateFolderBody> {
  const body = await readJsonObject(request);
  const input: UpdateFolderBody = {};

  if ("name" in body) {
    input.name = body.name as string;
  }

  if ("parentFolderId" in body) {
    input.parentFolderId = body.parentFolderId as string | null;
  }

  if (input.name === undefined && !("parentFolderId" in input)) {
    throw new ValidationError("Provide a name to rename or a parentFolderId to move");
  }

  return input;
}

export function parseDeleteStrategy(params: URLSearchParams): FolderDeleteStrategy {
  // Validated by FolderService; no default, by design (FR-FOLDER-3).
  return params.get("strategy") as FolderDeleteStrategy;
}
