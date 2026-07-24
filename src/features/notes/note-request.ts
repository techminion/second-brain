import type { CreateNoteInput, ListNotesOptions, UpdateNoteInput } from "@/features/notes/types";
import { ValidationError } from "@/shared/lib/errors";

// Boundary input marshalling for the note Web API. These functions do only
// *shape* work — decode the request, reject non-JSON-object bodies, and hand
// the fields to `NoteService`. All business validation (title non-empty, field
// types) stays in the service (05_API §3–4); the service re-checks every field
// at runtime, so the assertions here are safe pass-throughs of untrusted input.

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

export async function parseCreateNoteBody(request: Request): Promise<CreateNoteInput> {
  const body = await readJsonObject(request);
  const input: CreateNoteInput = { title: body.title as string };

  if (body.body !== undefined) {
    input.body = body.body as string;
  }

  if (body.folderId !== undefined) {
    input.folderId = body.folderId as string;
  }

  return input;
}

export async function parseUpdateNoteBody(request: Request): Promise<UpdateNoteInput> {
  const body = await readJsonObject(request);
  const input: UpdateNoteInput = {};

  // Presence (`in`), not truthiness: an explicit `folderId: null` means "move to
  // root", while an absent key means "leave unchanged".
  if ("title" in body) {
    input.title = body.title as string;
  }

  if ("body" in body) {
    input.body = body.body as string;
  }

  if ("folderId" in body) {
    input.folderId = body.folderId as string | null;
  }

  return input;
}

export function parseListNotesQuery(params: URLSearchParams): ListNotesOptions {
  const options: ListNotesOptions = {};

  const folderId = params.get("folderId");
  if (folderId) {
    options.folderId = folderId;
  }

  const cursor = params.get("cursor");
  if (cursor) {
    options.cursor = cursor;
  }

  // The service clamps the range and treats a non-finite value as the default,
  // so a malformed `limit` is normalized rather than rejected (list throws no
  // errors — 05_API §4).
  const limit = params.get("limit");
  if (limit !== null) {
    options.limit = Number(limit);
  }

  return options;
}
