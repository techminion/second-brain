import { NextResponse } from "next/server";

import { parseUpdateNoteBody } from "@/features/notes/note-request";
import { noteRoute } from "@/features/notes/note-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return noteRoute("api.notes.get", async ({ service, userId }) =>
    NextResponse.json({ data: await service.get(userId, id) }),
  )(request);
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return noteRoute("api.notes.update", async ({ request: req, service, userId }) => {
    const input = await parseUpdateNoteBody(req);
    return NextResponse.json({ data: await service.update(userId, id, input) });
  })(request);
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return noteRoute("api.notes.delete", async ({ service, userId }) => {
    await service.delete(userId, id);
    return NextResponse.json({ data: { id } });
  })(request);
}
