import { NextResponse } from "next/server";

import { parseDeleteStrategy, parseUpdateFolderBody } from "@/features/folders/folder-request";
import { folderRoute } from "@/features/folders/folder-route";
import type { Folder } from "@/features/folders/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return folderRoute("api.folders.update", async ({ request: req, service, userId }) => {
    const input = await parseUpdateFolderBody(req);
    let folder: Folder | undefined;

    if (input.name !== undefined) {
      folder = await service.rename(userId, id, input.name);
    }

    if ("parentFolderId" in input) {
      folder = await service.move(userId, id, input.parentFolderId ?? null);
    }

    return NextResponse.json({ data: folder });
  })(request);
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return folderRoute("api.folders.delete", async ({ request: req, service, userId }) => {
    await service.delete(userId, id, parseDeleteStrategy(new URL(req.url).searchParams));
    return NextResponse.json({ data: { id } });
  })(request);
}
