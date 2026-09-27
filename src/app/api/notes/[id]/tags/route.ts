import { NextResponse } from "next/server";

import { parseTagNameBody } from "@/features/notes/note-request";
import { noteRoute } from "@/features/notes/note-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Tag a note by name, creating the tag inline if new (FR-TAG-2). */
export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return noteRoute("api.notes.tags.add", async ({ request: req, service, userId }) => {
    const name = await parseTagNameBody(req);
    return NextResponse.json({ data: await service.addTag(userId, id, name) });
  })(request);
}
