import { NextResponse } from "next/server";

import { parseCreateNoteBody, parseListNotesQuery } from "@/features/notes/note-request";
import { noteRoute } from "@/features/notes/note-route";

export const GET = noteRoute("api.notes.list", async ({ request, service, userId }) => {
  const options = parseListNotesQuery(new URL(request.url).searchParams);
  return NextResponse.json({ data: await service.list(userId, options) });
});

export const POST = noteRoute("api.notes.create", async ({ request, service, userId }) => {
  const input = await parseCreateNoteBody(request);
  return NextResponse.json({ data: await service.create(userId, input) }, { status: 201 });
});
