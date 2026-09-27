import { NextResponse } from "next/server";

import { parsePaginationQuery } from "@/features/notes/note-request";
import { noteRoute } from "@/features/notes/note-route";

export const GET = noteRoute("api.notes.trash", async ({ request, service, userId }) => {
  const options = parsePaginationQuery(new URL(request.url).searchParams);
  return NextResponse.json({ data: await service.listTrash(userId, options) });
});
